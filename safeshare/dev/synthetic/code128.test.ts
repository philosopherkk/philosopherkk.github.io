import { expect, test } from 'vitest'
import {
  code128Checksum,
  code128Modules,
  code128PatternCount,
  code128StartPattern,
  code128Svg,
  code128Values,
} from './code128.ts'

test('code 128 set B encodes only the given text', () => {
  expect(code128PatternCount()).toBe(107)
  expect(code128StartPattern()).toBe('211214')
  const text = 'M4421908'
  const values = code128Values(text)
  expect(values[0]).toBe(104)
  expect(values.slice(1, 1 + text.length)).toEqual([...text].map((char) => char.charCodeAt(0) - 32))
  expect(code128Checksum('A')).toBe(34)
  expect(code128Modules(text).length).toBeGreaterThan(text.length * 6)
  const svg = code128Svg(text)
  expect(svg).toContain('fill="#000"')
  expect(svg).not.toContain('Chan')
  expect(svg).not.toContain(text.slice(0, 1) + 'extra')
})
