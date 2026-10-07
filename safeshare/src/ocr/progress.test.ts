import { expect, test } from 'vitest'
import { OCR_FAILED, ocrProgressLabel } from './progress.ts'

test('finding identifiers is its own step after the text has been read', () => {
  expect(ocrProgressLabel('finding', 0, 2)).toBe('Finding identifiers.')
})

test('progress names loading and then reading, one page at a time', () => {
  expect(ocrProgressLabel('loading', 0, 3)).toBe('Loading the reader.')
  expect(ocrProgressLabel('reading', 0, 1)).toBe('Reading text.')
  expect(ocrProgressLabel('reading', 0, 3)).toBe('Reading text, page 1 of 3.')
  expect(ocrProgressLabel('reading', 2, 3)).toBe('Reading text, page 3 of 3.')
  for (const label of [
    ocrProgressLabel('loading', 0, 2),
    ocrProgressLabel('reading', 1, 2),
    OCR_FAILED,
  ]) {
    expect(label.toLowerCase()).not.toContain('identifier')
    expect(label).not.toContain('http')
  }
})
