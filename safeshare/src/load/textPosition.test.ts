import { expect, test } from 'vitest'
import { pageTextFromItem, pageTextFromItems } from './textPosition.ts'

test('keeps pdf.js text in original page coordinates', () => {
  const run = pageTextFromItem({
    str: 'ABC',
    width: 30,
    height: 12,
    transform: [12, 0, 0, 12, 40, 700],
  })
  expect(run).toEqual({ text: 'ABC', x: 40, y: 700, width: 30, height: 12 })
})

test('skips empty strings and items without a translation', () => {
  const runs = pageTextFromItems([
    { str: '', width: 1, height: 1, transform: [1, 0, 0, 1, 0, 0] },
    { str: '12.5', width: 8, height: 4, transform: [1, 0, 0, 1] },
    { str: 'X', width: 5, height: 5, transform: [1, 0, 0, 1, 9, 8] },
  ])
  expect(runs).toEqual([{ text: 'X', x: 9, y: 8, width: 5, height: 5 }])
})
