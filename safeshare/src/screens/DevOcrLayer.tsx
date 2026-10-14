import { useEffect, useRef } from 'react'
import type { OcrWord } from '../ocr/types.ts'

const DEV_OCR_MARKER = 'safeshare-dev-ocr-boxes'

type DevBoxToggleProps = {
  show: boolean
  onChange: (show: boolean) => void
}

export function DevBoxToggle({ show, onChange }: DevBoxToggleProps) {
  return (
    <label className="dev-toggle" data-dev={DEV_OCR_MARKER}>
      <input
        type="checkbox"
        checked={show}
        onChange={(event) => {
          onChange(event.target.checked)
        }}
      />
      Show word boxes
    </label>
  )
}

type DevBoxOverlayProps = {
  width: number
  height: number
  words: readonly OcrWord[]
}

/** Rectangles only. Recognized strings are not drawn. */
export function DevBoxOverlay({ width, height, words }: DevBoxOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, width, height)
    context.strokeStyle = '#c45500'
    context.lineWidth = Math.max(2, Math.round(width / 600))
    for (const word of words) {
      context.strokeRect(word.box.x, word.box.y, word.box.width, word.box.height)
    }
  }, [height, width, words])

  return <canvas ref={canvasRef} className="ocr-debug" aria-hidden="true" />
}
