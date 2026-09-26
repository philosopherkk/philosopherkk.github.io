import { expect, test } from 'vitest'
import { paintExport, watermarkBand } from './paintExport.ts'
import { WATERMARK_TEXT } from './names.ts'

test('enabled boxes are filled black on the export canvas and disabled boxes are not', () => {
  const calls: string[] = []
  const canvas = { width: 0, height: 0 }
  const context = {
    canvas,
    fillStyle: '' as string,
    globalAlpha: 0,
    font: '',
    textAlign: 'start' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    fillRect(x: number, y: number, width: number, height: number) {
      calls.push(`fill ${this.fillStyle} ${this.globalAlpha} ${x} ${y} ${width} ${height}`)
    },
    drawImage(_image: CanvasImageSource, x: number, y: number, width: number, height: number) {
      calls.push(`image ${x} ${y} ${width} ${height}`)
    },
    fillText(text: string, x: number, y: number) {
      calls.push(`text ${text} ${x} ${y}`)
    },
  }
  paintExport(
    context as unknown as CanvasRenderingContext2D,
    {} as CanvasImageSource,
    100,
    80,
    [
      { enabled: true, bbox: { x: 10, y: 10, width: 20, height: 8 } },
      { enabled: false, bbox: { x: 40, y: 40, width: 10, height: 10 } },
    ],
    2,
    true,
  )
  expect(canvas).toEqual({ width: 100, height: 80 + watermarkBand(100, true) })
  expect(calls.some((call) => call.startsWith('image 0 0 100 80'))).toBe(true)
  expect(calls).toContain('fill #000000 1 20 20 40 16')
  expect(calls.some((call) => call.includes('fill #000000 1 80 80'))).toBe(false)
  expect(calls.some((call) => call.includes(WATERMARK_TEXT))).toBe(true)
})

test('watermark off keeps the canvas the same height as the bitmap', () => {
  const canvas = { width: 0, height: 0 }
  const context = {
    canvas,
    fillStyle: '',
    globalAlpha: 1,
    font: '',
    textAlign: 'start' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    fillRect() {},
    drawImage() {},
    fillText() {
      throw new Error('watermark')
    },
  }
  paintExport(
    context as unknown as CanvasRenderingContext2D,
    {} as CanvasImageSource,
    40,
    20,
    [],
    1,
    false,
  )
  expect(canvas.height).toBe(20)
  expect(watermarkBand(40, false)).toBe(0)
})
