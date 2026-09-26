import { expect, test } from 'vitest'
import { dragBox, isTap, pinchView } from './gestures.ts'

test('a short movement is a tap and a longer drag becomes a box', () => {
  expect(isTap({ x: 0, y: 0 }, { x: 4, y: 3 })).toBe(true)
  expect(isTap({ x: 0, y: 0 }, { x: 20, y: 0 })).toBe(false)
  expect(dragBox({ x: 5, y: 5 }, { x: 8, y: 30 })).toBeNull()
  expect(dragBox({ x: 30, y: 10 }, { x: 10, y: 40 })).toEqual({
    x: 10,
    y: 10,
    width: 20,
    height: 30,
  })
})

test('pinch scales around the midpoint and follows a two-finger pan', () => {
  const zoomed = pinchView(
    { scale: 1, x: 0, y: 0, distance: 100, midX: 50, midY: 50 },
    { distance: 200, midX: 50, midY: 50 },
  )
  expect(zoomed.scale).toBe(2)
  expect(zoomed.x).toBe(-50)
  expect(zoomed.y).toBe(-50)

  const panned = pinchView(
    { scale: 2, x: -50, y: -50, distance: 200, midX: 50, midY: 50 },
    { distance: 200, midX: 70, midY: 40 },
  )
  expect(panned.scale).toBe(2)
  expect(panned.x).toBe(-30)
  expect(panned.y).toBe(-60)
})
