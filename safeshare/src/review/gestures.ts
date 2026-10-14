import type { Box } from '../ocr/boxes.ts'
import type { Point, View } from './types.ts'

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function isTap(start: Point, end: Point, threshold = 10): boolean {
  return distance(start, end) <= threshold
}

/** A drag smaller than `min` on either side is not a box. */
export function dragBox(start: Point, end: Point, min = 8): Box | null {
  const width = Math.abs(end.x - start.x)
  const height = Math.abs(end.y - start.y)
  if (width < min || height < min) return null
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width,
    height,
  }
}

export const MIN_SCALE = 1
export const MAX_SCALE = 6

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

/** Grow or shrink around a point in the viewport, so that point stays under the finger. */
export function zoomAround(view: View, nextScale: number, originX: number, originY: number): View {
  const scale = clampScale(nextScale)
  if (view.scale === 0) return { scale, x: view.x, y: view.y }
  const ratio = scale / view.scale
  return {
    scale,
    x: originX - (originX - view.x) * ratio,
    y: originY - (originY - view.y) * ratio,
  }
}

export function panBy(view: View, dx: number, dy: number): View {
  return { scale: view.scale, x: view.x + dx, y: view.y + dy }
}

/**
 * Scale around the pinch midpoint and follow the fingers when they pan.
 * `origin` is the view and finger pair at the start of the gesture.
 */
export function pinchView(
  origin: View & { distance: number; midX: number; midY: number },
  next: { distance: number; midX: number; midY: number },
): View {
  if (origin.distance <= 0 || next.distance <= 0)
    return { scale: origin.scale, x: origin.x, y: origin.y }
  const scale = clampScale(origin.scale * (next.distance / origin.distance))
  const ratio = origin.scale === 0 ? 1 : scale / origin.scale
  return {
    scale,
    x: next.midX - (origin.midX - origin.x) * ratio,
    y: next.midY - (origin.midY - origin.y) * ratio,
  }
}
