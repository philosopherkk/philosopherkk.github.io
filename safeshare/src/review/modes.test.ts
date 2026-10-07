import { expect, test } from 'vitest'
import type { Detection, ZoneLayout } from '../detect/types.ts'
import {
  boxesForMode,
  formatCategoryCounts,
  lowOverallConfidence,
  missingNameOrId,
} from './modes.ts'
import type { ReviewBox } from './types.ts'
import { containsBox } from './hitTest.ts'

const layout: ZoneLayout = {
  pageWidth: 100,
  pageHeight: 200,
  uncertain: false,
  resultsBand: { y: 80, height: 60 },
  resultRows: [
    { y: 90, height: 20 },
    { y: 120, height: 20 },
  ],
}

function detection(id: string, category: Detection['category'], enabled = true): Detection {
  return {
    id,
    bbox: { x: 10, y: 10, width: 20, height: 12 },
    category,
    source: 'pattern',
    confidence: 0.9,
    enabled,
  }
}

function drawn(id: string): ReviewBox {
  return {
    id,
    bbox: { x: 4, y: 4, width: 12, height: 12 },
    category: 'drawn',
    enabled: true,
    origin: 'drawn',
  }
}

function covers(boxes: readonly ReviewBox[], x: number, y: number): boolean {
  return boxes.some((box) => box.enabled && containsBox(box.bbox, { x, y }))
}

test('category counts use labels only', () => {
  const boxes = [
    ...Array.from({ length: 3 }, (_, index) => detection(`n${index}`, 'name')),
    detection('id', 'hkid'),
    detection('b1', 'barcode'),
    detection('b2', 'barcode'),
    detection('off', 'phone', false),
  ].map((item) => ({ category: item.category, enabled: item.enabled }))
  expect(formatCategoryCounts(boxes)).toBe('3 names, 1 HKID, 2 barcodes')
  expect(formatCategoryCounts([])).toBe('No boxes covering the page.')
})

test('standard keeps detection boxes and header blackout covers only outside the results band', () => {
  const detections = [detection('name-1', 'name')]
  const standard = boxesForMode('standard', detections, [drawn('d1')], layout, new Set())
  expect(standard.map((box) => box.id)).toEqual(['name-1', 'd1'])

  const blackout = boxesForMode('header-blackout', detections, [drawn('d1')], layout, new Set())
  expect(blackout.map((box) => box.id)).toEqual(['zone-header', 'zone-footer', 'd1'])
  expect(covers(blackout, 50, 10)).toBe(true)
  expect(covers(blackout, 50, 100)).toBe(false)
  expect(covers(blackout, 50, 180)).toBe(true)
  expect(covers(blackout, 10, 10)).toBe(true)
})

test('results only leaves result rows open and manual keeps drawn boxes alone', () => {
  const detections = [detection('name-1', 'name')]
  const strict = boxesForMode('results-only', detections, [], layout, new Set())
  expect(covers(strict, 50, 95)).toBe(false)
  expect(covers(strict, 50, 125)).toBe(false)
  expect(covers(strict, 50, 110)).toBe(true)
  expect(covers(strict, 50, 10)).toBe(true)
  expect(strict.some((box) => box.origin === 'detection')).toBe(false)

  const manual = boxesForMode('manual', detections, [drawn('d1')], layout, new Set())
  expect(manual.map((box) => box.id)).toEqual(['d1'])
})

test('a disabled zone box stays in the list without covering the page', () => {
  const boxes = boxesForMode('header-blackout', [], [], layout, new Set(['zone-header']))
  const header = boxes.find((box) => box.id === 'zone-header')
  expect(header?.enabled).toBe(false)
  expect(covers(boxes, 50, 10)).toBe(false)
  expect(covers(boxes, 50, 180)).toBe(true)
})

test('uncertain pages are treated as header for both blackout modes', () => {
  const uncertain: ZoneLayout = {
    pageWidth: 80,
    pageHeight: 80,
    uncertain: true,
    resultsBand: null,
    resultRows: [],
  }
  for (const mode of ['header-blackout', 'results-only'] as const) {
    const boxes = boxesForMode(mode, [detection('name-1', 'name')], [], uncertain, new Set())
    expect(covers(boxes, 40, 40)).toBe(true)
    expect(boxes.some((box) => box.origin === 'detection')).toBe(false)
  }
  const withRow: ZoneLayout = {
    ...uncertain,
    resultRows: [{ y: 20, height: 20 }],
  }
  expect(covers(boxesForMode('results-only', [], [], withRow, new Set()), 40, 30)).toBe(true)
})

test('low confidence and a missing name or id are decided without reading text', () => {
  expect(lowOverallConfidence([])).toBe(true)
  expect(lowOverallConfidence([{ confidence: 90 }, { confidence: 80 }])).toBe(false)
  expect(lowOverallConfidence([{ confidence: 30 }, { confidence: 40 }])).toBe(true)
  expect(missingNameOrId([{ category: 'phone' }])).toBe(true)
  expect(missingNameOrId([{ category: 'name' }])).toBe(false)
  expect(missingNameOrId([{ category: 'hkid' }])).toBe(false)
})
