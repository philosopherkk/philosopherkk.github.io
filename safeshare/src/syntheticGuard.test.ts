import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

function walk(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'out') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else files.push(full)
  }
  return files
}

test('the production app does not import the synthetic generator', () => {
  const sources = walk(join(appRoot, 'src')).filter(
    (file) => /\.(ts|tsx|html)$/.test(file) && !file.endsWith('syntheticGuard.test.ts'),
  )
  sources.push(join(appRoot, 'index.html'))
  for (const file of sources) {
    const text = readFileSync(file, 'utf8')
    expect(text, relative(appRoot, file)).not.toMatch(/dev\/synthetic/)
    expect(text, relative(appRoot, file)).not.toContain('safeshare-dev-synthetic')
  }
})
