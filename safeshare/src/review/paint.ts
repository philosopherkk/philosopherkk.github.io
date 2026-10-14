import type { Box } from '../ocr/boxes.ts'
import type { ReviewBox } from './types.ts'

export type RedactionContext = {
  fillStyle: string | CanvasGradient | CanvasPattern
  globalAlpha: number
  fillRect: (x: number, y: number, width: number, height: number) => void
}

/** Opaque black fill for every enabled box. Export will call this same function. */
export function paintRedactions(
  context: RedactionContext,
  boxes: readonly { enabled: boolean; bbox: Box }[],
): void {
  context.globalAlpha = 1
  context.fillStyle = '#000000'
  for (const box of boxes) {
    if (!box.enabled) continue
    if (box.bbox.width <= 0 || box.bbox.height <= 0) continue
    context.fillRect(box.bbox.x, box.bbox.y, box.bbox.width, box.bbox.height)
  }
}

/** Review preview. Enabled boxes use paintRedactions; a removed box is only an outline. */
export function paintReview(
  context: CanvasRenderingContext2D,
  boxes: readonly ReviewBox[],
  draft: Box | null,
  peeking: boolean,
): void {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height)
  if (peeking) return
  paintRedactions(context, boxes)
  context.save()
  context.globalAlpha = 1
  context.strokeStyle = '#000000'
  context.lineWidth = Math.max(2, context.canvas.width / 180)
  context.setLineDash([8, 6])
  for (const box of boxes) {
    if (box.enabled) continue
    context.strokeRect(box.bbox.x, box.bbox.y, box.bbox.width, box.bbox.height)
  }
  if (draft) context.strokeRect(draft.x, draft.y, draft.width, draft.height)
  context.restore()
}
