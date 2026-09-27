import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

function sources(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...sources(full))
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) files.push(full)
  }
  return files
}

describe('hong kong detector scope', () => {
  test('does not mention malay, nric, or mykad', () => {
    const text = sources(join(import.meta.dirname, '.'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n')
    expect(text.toLowerCase()).not.toMatch(/mykad|\bnric\b|\bmalay\b|\bmsa\b/)
  })
})
