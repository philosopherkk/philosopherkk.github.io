import { useEffect, useRef } from 'react'

type PageCanvasProps = {
  bitmap: ImageBitmap
  label: string
}

export function PageCanvas({ bitmap, label }: PageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) return
    context.drawImage(bitmap, 0, 0)
  }, [bitmap])

  return <canvas ref={canvasRef} role="img" aria-label={label} />
}
