import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { hkidCheckDigit } from '../../src/detect/hkid.ts'
import { code128Svg } from './code128.ts'
import { reportFacts, reportHtml, reportSpec } from './report.ts'

test('a fictional report uses a real HKID checksum and a barcode of only the MRN', () => {
  const bilingual = [0, 1, 2, 3, 4, 5, 6, 7].find(
    (index) => reportSpec(index).layout === 'bilingual',
  )
  if (bilingual === undefined) throw new Error('bilingual')
  const facts = reportFacts(bilingual)
  const body = facts.hkid.slice(0, -3)
  const check = facts.hkid.slice(-2, -1)
  expect(hkidCheckDigit(body)).toBe(check)
  const html = reportHtml(facts)
  expect(html).toContain(code128Svg(facts.mrn))
  expect(html).not.toContain('<text')
  expect(html).toContain('data-category="barcode"')
  expect(html).toContain('data-role="result"')
  expect(html).toContain('>Name<')
  expect(html).toContain('>DOB<')
  expect(html).toContain('>Requested by<')
  expect(html).toContain('姓名')
  expect(html.toLowerCase()).not.toMatch(/mykad|\bnric\b|\bmalay\b|singapore/)
})

test('generator source does not describe Malaysian or Singaporean documents', () => {
  const dir = dirname(fileURLToPath(import.meta.url))
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.ts') || name.endsWith('.test.ts')) continue
    const text = readFileSync(join(dir, name), 'utf8').toLowerCase()
    expect(text, name).not.toMatch(/mykad|\bnric\b|\bmalay\b|singapore/)
  }
})
