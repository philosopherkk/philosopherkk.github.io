import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Page } from '@playwright/test'
import { reportFacts, reportHtml, type ReportSpec } from './report.ts'
import {
  addScore,
  emptyModeScore,
  HARNESS_MODES,
  manualModeNote,
  rate,
  scaleBox,
  scorePage,
  type Miss,
  type ModeScore,
  type TruthItem,
} from './score.ts'

type Measured = {
  width: number
  height: number
  items: TruthItem[]
}

type Analysis = {
  width: number
  height: number
  uncertain: boolean
  words: TruthItem['bbox'][]
  modes: Record<string, { category: string; bbox: TruthItem['bbox'] }[]>
}

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'out')

function pngSize(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
}

function phoneOptions(
  spec: ReportSpec,
): { rotate: number; blur: number; noise: number; seed: number } | null {
  if (spec.variant !== 'phone') return null
  return {
    rotate: spec.index % 4 === 1 ? 1.3 : -1.15,
    blur: 0.45,
    noise: 0.05,
    seed: spec.index + 3,
  }
}

async function prepare(page: Page, origin: string) {
  await page.goto(`${origin}dev/synthetic/harness.html`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__ready === true)
}

function percent(value: number | null): string {
  if (value === null) return 'n/a'
  return `${(value * 100).toFixed(1)}%`
}

function printScores(title: string, score: ModeScore) {
  const lines = [
    `${title} recall ${percent(rate(score.recallHits, score.recallTotal))} (${score.recallHits}/${score.recallTotal})`,
    `  result preservation ${percent(rate(score.preserved, score.results))} (${score.preserved}/${score.results})`,
    `  over-redaction ${percent(rate(score.results - score.preserved, score.results))} of result values`,
    `  redaction boxes touching a result ${score.redactionsTouchingResults}/${score.redactions}`,
  ]
  const keys = [...score.byCategory.keys()].sort()
  for (const key of keys) {
    const item = score.byCategory.get(key)
    if (!item) continue
    lines.push(`  ${key} ${percent(rate(item.hits, item.total))} (${item.hits}/${item.total})`)
  }
  console.log(lines.join('\n'))
}

function topMisses(misses: readonly Miss[]): { key: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const miss of misses) {
    const key = `${miss.variant} ${miss.mode} ${miss.category}${miss.script ? `:${miss.script}` : ''} ${miss.reason}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
}

export async function main(origin: string) {
  const limit = Number(process.env.ACCURACY_LIMIT ?? '100')
  const count = Number.isFinite(limit) && limit > 0 ? Math.min(100, Math.floor(limit)) : 100
  await mkdir(join(OUT, 'reports'), { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1200, height: 1600 },
    deviceScaleFactor: 1,
  })
  page.setDefaultTimeout(120000)
  const grouped = new Map<string, ModeScore>()
  const misses: Miss[] = []
  let uncertain = 0
  try {
    await prepare(page, origin)
    for (let index = 0; index < count; index += 1) {
      const facts = reportFacts(index)
      const spec = facts.spec
      await page.evaluate(mountHtml, reportHtml(facts))
      const noise = phoneOptions(spec)
      if (noise) await page.evaluate(applyNoise, noise)
      const measured = await page.evaluate(readMeasure)
      const png = await page.locator('#frame').screenshot({ type: 'png' })
      const size = pngSize(png)
      if (measured.width <= 0 || measured.items.length === 0) throw new Error(`empty-${spec.id}`)
      const scaleX = size.width / measured.width
      const scaleY = size.height / measured.height
      const items = measured.items.map((item) => ({
        ...item,
        bbox: scaleBox(item.bbox, scaleX, scaleY),
      }))
      const analysis = await page.evaluate(runAnalyse, png.toString('base64'))
      if (analysis.uncertain) uncertain += 1
      await writeFile(join(OUT, 'reports', `${spec.id}.png`), png)
      await writeFile(
        join(OUT, 'reports', `${spec.id}.json`),
        JSON.stringify(
          {
            id: spec.id,
            layout: spec.layout,
            variant: spec.variant,
            width: size.width,
            height: size.height,
            items,
          },
          null,
          2,
        ),
      )
      for (const mode of HARNESS_MODES) {
        const scored = scorePage(items, analysis.modes[mode] ?? [], analysis.words, {
          id: spec.id,
          variant: spec.variant,
          layout: spec.layout,
          mode,
        })
        const key = `${spec.variant}:${mode}`
        const bucket = grouped.get(key) ?? emptyModeScore()
        addScore(bucket, scored.score)
        grouped.set(key, bucket)
        misses.push(...scored.misses)
      }
      if ((index + 1) % 10 === 0) console.log(`scored ${index + 1}/${count}`)
    }
  } finally {
    await browser.close()
  }

  const summary = {
    reports: count,
    manual: manualModeNote(),
    uncertainPages: uncertain,
    modes: {} as Record<string, unknown>,
    topMisses: topMisses(misses),
  }
  for (const mode of HARNESS_MODES) {
    summary.modes[mode] = {}
    for (const variant of ['clean', 'phone'] as const) {
      const score = grouped.get(`${variant}:${mode}`) ?? emptyModeScore()
      printScores(`${mode} ${variant}`, score)
      const categories: Record<string, { hits: number; total: number; rate: number | null }> = {}
      for (const [key, value] of score.byCategory) {
        categories[key] = { ...value, rate: rate(value.hits, value.total) }
      }
      ;(summary.modes[mode] as Record<string, unknown>)[variant] = {
        recall: rate(score.recallHits, score.recallTotal),
        recallHits: score.recallHits,
        recallTotal: score.recallTotal,
        preservation: rate(score.preserved, score.results),
        preserved: score.preserved,
        results: score.results,
        overRedaction: rate(score.results - score.preserved, score.results),
        redactionsTouchingResults: score.redactionsTouchingResults,
        redactions: score.redactions,
        categories,
      }
    }
  }
  console.log(`uncertain pages ${uncertain}`)
  console.log('manual automatic recall not-applicable')
  for (const miss of summary.topMisses) console.log(`miss ${miss.count} ${miss.key}`)
  await writeFile(join(OUT, 'metrics.json'), JSON.stringify(summary, null, 2))
}

function mountHtml(html: string) {
  const mount = (window as unknown as { mount: (value: string) => void }).mount
  mount(html)
}

function applyNoise(options: { rotate: number; blur: number; noise: number; seed: number }) {
  const apply = (
    window as unknown as {
      phoneNoise: (value: { rotate: number; blur: number; noise: number; seed: number }) => void
    }
  ).phoneNoise
  apply(options)
}

function readMeasure(): Measured {
  return (window as unknown as { measure: () => Measured }).measure()
}

function runAnalyse(base64: string): Promise<Analysis> {
  return (window as unknown as { analyse: (value: string) => Promise<Analysis> }).analyse(base64)
}
