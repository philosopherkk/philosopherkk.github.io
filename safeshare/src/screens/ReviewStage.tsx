import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { dragBox, isTap, pinchView } from '../review/gestures.ts'
import { hitTest } from '../review/hitTest.ts'
import { paintReview } from '../review/paint.ts'
import type { Point, ReviewBox, View } from '../review/types.ts'
import { PageCanvas } from './PageCanvas.tsx'

type ReviewStageProps = {
  bitmap: ImageBitmap
  label: string
  boxes: readonly ReviewBox[]
  peeking: boolean
  onToggle: (id: string) => void
  onDraw: (box: ReviewBox['bbox']) => void
}

type PinchOrigin = View & { distance: number; midX: number; midY: number }

function toBitmap(clientX: number, clientY: number, canvas: HTMLCanvasElement): Point {
  const rect = canvas.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 }
  return {
    x: ((clientX - rect.left) / rect.width) * canvas.width,
    y: ((clientY - rect.top) / rect.height) * canvas.height,
  }
}

export function ReviewStage({ bitmap, label, boxes, peeking, onToggle, onDraw }: ReviewStageProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const pointers = useRef(new Map<number, Point>())
  const drawStart = useRef<Point | null>(null)
  const drawing = useRef(false)
  const pinchOrigin = useRef<PinchOrigin | null>(null)
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 })
  const viewRef = useRef(view)
  const [draft, setDraft] = useState<ReviewBox['bbox'] | null>(null)

  useEffect(() => {
    const viewport = viewportRef.current
    const fit = fitRef.current
    if (!viewport || !fit) return
    const resize = () => {
      const bounds = viewport.getBoundingClientRect()
      const aspect = bitmap.width / Math.max(1, bitmap.height)
      let width = bounds.width
      let height = width / aspect
      if (bounds.height > 0 && height > bounds.height) {
        height = bounds.height
        width = height * aspect
      }
      fit.style.width = `${Math.max(1, width)}px`
      fit.style.height = `${Math.max(1, height)}px`
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [bitmap])

  useEffect(() => {
    const canvas = overlayRef.current
    if (!canvas) return
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) return
    paintReview(context, boxes, draft, peeking)
  }, [bitmap, boxes, draft, peeking])

  function updateView(next: View) {
    viewRef.current = next
    setView(next)
  }

  function pinchFromPointers() {
    const viewport = viewportRef.current
    const points = [...pointers.current.values()]
    const first = points[0]
    const second = points[1]
    if (!viewport || !first || !second) return null
    const host = viewport.getBoundingClientRect()
    return {
      distance: Math.hypot(second.x - first.x, second.y - first.y),
      midX: (first.x + second.x) / 2 - host.left,
      midY: (first.y + second.y) / 2 - host.top,
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size >= 2) {
      drawStart.current = null
      drawing.current = false
      setDraft(null)
      const pair = pinchFromPointers()
      if (pair) pinchOrigin.current = { ...viewRef.current, ...pair }
      return
    }
    const canvas = overlayRef.current
    if (!canvas) return
    drawStart.current = toBitmap(event.clientX, event.clientY, canvas)
    drawing.current = false
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size >= 2) {
      const pair = pinchFromPointers()
      if (pair && pinchOrigin.current) updateView(pinchView(pinchOrigin.current, pair))
      return
    }
    const canvas = overlayRef.current
    const start = drawStart.current
    if (!canvas || !start) return
    const point = toBitmap(event.clientX, event.clientY, canvas)
    if (!isTap(start, point)) {
      drawing.current = true
      const next = dragBox(start, point, 1)
      setDraft(next)
    }
  }

  function finishPointer(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinchOrigin.current = null
    if (pointers.current.size > 0) {
      drawStart.current = null
      drawing.current = false
      setDraft(null)
      return
    }
    const canvas = overlayRef.current
    const start = drawStart.current
    drawStart.current = null
    const wasDrawing = drawing.current
    drawing.current = false
    setDraft(null)
    if (!canvas || !start) return
    const point = toBitmap(event.clientX, event.clientY, canvas)
    if (wasDrawing) {
      const box = dragBox(start, point, 8)
      if (box) onDraw(box)
      return
    }
    if (!isTap(start, point)) return
    const id = hitTest(boxes, point)
    if (id) onToggle(id)
  }

  return (
    <div
      ref={viewportRef}
      className="review-viewport"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
    >
      <div
        className="page-stage"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
      >
        <div ref={fitRef} className="page-fit">
          <PageCanvas bitmap={bitmap} label={label} />
          <canvas ref={overlayRef} className="redact-layer" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
