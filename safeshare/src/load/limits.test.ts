import { describe, expect, test } from 'vitest'
import {
  DISPLAY_MAX_SIDE,
  EXPORT_MAX_SIDE,
  PDF_TARGET_WIDTH,
  displaySize,
  pdfPageCountBlock,
  pdfPagePlan,
  rasterPlan,
  renderedPdfSize,
} from './limits.ts'

describe('display and export resolution', () => {
  test('keeps a small image at its own size for both display and export', () => {
    expect(rasterPlan(1800, 1200)).toEqual({
      display: { width: 1800, height: 1200 },
      keepExport: true,
    })
  })

  test('downscales the view when the longest side is above 2500 and still keeps export at 3000', () => {
    const plan = rasterPlan(2800, 1400)
    expect(plan.keepExport).toBe(true)
    expect(Math.max(plan.display.width, plan.display.height)).toBeLessThanOrEqual(DISPLAY_MAX_SIDE)
    expect(plan.display).toEqual(displaySize(2800, 1400))
  })

  test('does not keep an export bitmap larger than 3000 px', () => {
    const plan = rasterPlan(4000, 3000)
    expect(plan.keepExport).toBe(false)
    expect(Math.max(4000, 3000)).toBeGreaterThan(EXPORT_MAX_SIDE)
    expect(Math.max(plan.display.width, plan.display.height)).toBe(DISPLAY_MAX_SIDE)
  })

  test('keeps export exactly at the 3000 px boundary', () => {
    expect(rasterPlan(3000, 2000).keepExport).toBe(true)
    expect(rasterPlan(3001, 2000).keepExport).toBe(false)
  })

  test('display longest side never exceeds 2500', () => {
    for (const [width, height] of [
      [2500, 2500],
      [2501, 10],
      [10, 9000],
      [10000, 1],
    ] as const) {
      const size = displaySize(width, height)
      expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(DISPLAY_MAX_SIDE)
    }
  })
})

describe('pdf page plan', () => {
  test('renders about 2000 px wide, then applies the display and export rules', () => {
    const rendered = renderedPdfSize(595, 842)
    expect(rendered.width).toBe(PDF_TARGET_WIDTH)
    const plan = pdfPagePlan(595, 842)
    expect(plan.rendered.width).toBe(PDF_TARGET_WIDTH)
    expect(plan.rendered.height).toBeGreaterThan(DISPLAY_MAX_SIDE)
    expect(plan.rendered.height).toBeLessThanOrEqual(EXPORT_MAX_SIDE)
    expect(plan.keepExport).toBe(true)
    expect(Math.max(plan.display.width, plan.display.height)).toBeLessThanOrEqual(DISPLAY_MAX_SIDE)
  })

  test('drops the export bitmap when a rendered page is taller than 3000 px', () => {
    const plan = pdfPagePlan(100, 500)
    expect(plan.rendered.width).toBe(PDF_TARGET_WIDTH)
    expect(plan.rendered.height).toBeGreaterThan(EXPORT_MAX_SIDE)
    expect(plan.keepExport).toBe(false)
    expect(Math.max(plan.display.width, plan.display.height)).toBe(DISPLAY_MAX_SIDE)
  })
})

describe('pdf page limit', () => {
  test('allows 1 to 10 pages and blocks the rest', () => {
    expect(pdfPageCountBlock(1)).toBeNull()
    expect(pdfPageCountBlock(10)).toBeNull()
    expect(pdfPageCountBlock(11)).toBe('too-many-pages')
    expect(pdfPageCountBlock(0)).toBe('pdf-decode')
    expect(pdfPageCountBlock(-1)).toBe('pdf-decode')
  })
})
