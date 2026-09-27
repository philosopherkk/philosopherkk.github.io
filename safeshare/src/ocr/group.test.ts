import { describe, expect, test } from 'vitest'
import { groupWords, pageWords, type PositionedWord } from './group.ts'

function word(text: string, x: number, y: number, confidence = 90): PositionedWord {
  return { text, confidence, box: { x, y, width: 20, height: 10 } }
}

describe('line and block grouping', () => {
  test('puts words on one baseline in one line and one block, left to right', () => {
    const grouped = groupWords([word('BB', 40, 1, 80), word('AA', 0, 0, 95)])
    expect(grouped.map((item) => item.text)).toEqual(['AA', 'BB'])
    expect(grouped.every((item) => item.line === 0 && item.block === 0)).toBe(true)
    expect(grouped[0]?.confidence).toBe(95)
  })

  test('starts a new block when the next line has a clear gap', () => {
    const grouped = groupWords([word('AA', 0, 0), word('BB', 30, 0), word('CC', 0, 40)])
    expect(grouped.map((item) => [item.text, item.line, item.block])).toEqual([
      ['AA', 0, 0],
      ['BB', 0, 0],
      ['CC', 1, 1],
    ])
  })

  test('keeps a tight second line in the same block', () => {
    const grouped = groupWords([word('AA', 0, 0), word('BB', 0, 12)])
    expect(grouped.map((item) => item.block)).toEqual([0, 0])
    expect(grouped.map((item) => item.line)).toEqual([0, 1])
  })
})

describe('engine blocks', () => {
  test('uses block and line order from the recognition tree', () => {
    const words = pageWords({
      blocks: [
        {
          paragraphs: [
            {
              lines: [
                {
                  words: [
                    { text: 'AA', confidence: 88, bbox: { x0: 1, y0: 2, x1: 11, y1: 12 } },
                    { text: ' ', confidence: 10, bbox: { x0: 12, y0: 2, x1: 14, y1: 12 } },
                    { text: 'BB', confidence: 140, bbox: { x0: 15, y0: 2, x1: 25, y1: 14 } },
                  ],
                },
              ],
            },
          ],
        },
        {
          paragraphs: [
            {
              lines: [
                {
                  words: [{ text: 'CC', confidence: 70, bbox: { x0: 1, y0: 40, x1: 9, y1: 50 } }],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(words).toEqual([
      { text: 'AA', confidence: 88, box: { x: 1, y: 2, width: 10, height: 10 }, line: 0, block: 0 },
      {
        text: 'BB',
        confidence: 100,
        box: { x: 15, y: 2, width: 10, height: 12 },
        line: 0,
        block: 0,
      },
      { text: 'CC', confidence: 70, box: { x: 1, y: 40, width: 8, height: 10 }, line: 1, block: 1 },
    ])
  })

  test('groups a flat word list when the engine returns no blocks', () => {
    const words = pageWords({
      blocks: null,
      words: [
        { text: 'BB', confidence: 50, bbox: { x0: 30, y0: 0, x1: 50, y1: 10 } },
        { text: 'AA', confidence: 60, bbox: { x0: 0, y0: 0, x1: 20, y1: 10 } },
      ],
    })
    expect(words.map((item) => item.text)).toEqual(['AA', 'BB'])
    expect(words[0]?.line).toBe(0)
    expect(words[0]?.block).toBe(0)
  })
})
