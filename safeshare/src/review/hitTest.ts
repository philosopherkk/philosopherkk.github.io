import type { Box } from '../ocr/boxes.ts'
import type { Point, ReviewBox } from './types.ts'

export function containsBox(box: Box, point: Point): boolean {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  )
}

/** Topmost box wins. Later boxes are painted above earlier ones. */
export function hitTest(boxes: readonly ReviewBox[], point: Point): string | null {
  for (let index = boxes.length - 1; index >= 0; index -= 1) {
    const box = boxes[index]
    if (box && containsBox(box.bbox, point)) return box.id
  }
  return null
}

export function toggleById<T extends { id: string; enabled: boolean }>(
  items: readonly T[],
  id: string,
): T[] {
  return items.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
}
