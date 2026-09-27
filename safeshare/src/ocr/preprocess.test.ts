import { describe, expect, test } from 'vitest'
import { contrastStretch, grayscale, prepareOcrPixels } from './preprocess.ts'

describe('ocr preprocess', () => {
  test('converts a pixel to Rec. 709 gray and keeps the size', () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 128])
    expect(grayscale(rgba)[0]).toBe(Math.round(0.2126 * 255))
    const prepared = prepareOcrPixels(rgba)
    expect(prepared).toHaveLength(4)
    expect(prepared[3]).toBe(255)
    expect(prepared[0]).toBe(prepared[1])
    expect(prepared[1]).toBe(prepared[2])
  })

  test('stretches a low and a high gray level apart', () => {
    const gray = new Uint8Array(200)
    gray.fill(10, 0, 100)
    gray.fill(200, 100)
    const stretched = contrastStretch(gray)
    expect(stretched[0]).toBe(0)
    expect(stretched[100]).toBe(255)
  })

  test('leaves a flat image unchanged', () => {
    const gray = new Uint8Array([40, 40, 40, 40])
    expect(Array.from(contrastStretch(gray))).toEqual([40, 40, 40, 40])
  })
})
