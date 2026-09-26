import { useEffect, useState, type ComponentType } from 'react'
import type { LoadedDocument } from '../load/types.ts'
import type { OcrWord } from '../ocr/types.ts'
import type { PageOcr } from '../ocr/types.ts'
import { PageCanvas } from './PageCanvas.tsx'

type DevToggle = ComponentType<{ show: boolean; onChange: (show: boolean) => void }>
type DevOverlay = ComponentType<{
  width: number
  height: number
  words: readonly OcrWord[]
}>

type ReviewScreenProps = {
  document: LoadedDocument | null
  ocr: readonly PageOcr[] | null
  status: string | null
  error: string | null
}

export function ReviewScreen({ document, ocr, status, error }: ReviewScreenProps) {
  const [showBoxes, setShowBoxes] = useState(false)
  const [DevToggle, setDevToggle] = useState<DevToggle | null>(null)
  const [DevOverlay, setDevOverlay] = useState<DevOverlay | null>(null)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    let cancelled = false
    void import('./DevOcrLayer.tsx').then((mod) => {
      if (cancelled) return
      setDevToggle(() => mod.DevBoxToggle)
      setDevOverlay(() => mod.DevBoxOverlay)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!document || document.pages.length === 0) {
    return (
      <section className="stack">
        <h2>Review</h2>
        <p>
          No image is loaded. Black boxes will cover identifiers here. You confirm the page before
          anything is shared. Images and text stay in memory only and are not saved on this phone.
        </p>
      </section>
    )
  }

  const count = document.pages.length
  return (
    <section className="stack">
      <h2>Review</h2>
      <p>{count === 1 ? '1 page' : `${count} pages`} loaded on this phone. Nothing is saved.</p>
      {status ? <p role="status">{status}</p> : null}
      {error ? (
        <p role="alert" className="alert">
          {error}
        </p>
      ) : null}
      {DevToggle ? <DevToggle show={showBoxes} onChange={setShowBoxes} /> : null}
      <ol className="pages">
        {document.pages.map((page) => {
          const words = ocr?.find((item) => item.index === page.index)?.words ?? []
          return (
            <li key={page.index} className="page-frame">
              <div className="page-stage">
                <PageCanvas bitmap={page.display} label={`Page ${page.index + 1}`} />
                {DevOverlay && showBoxes ? (
                  <DevOverlay
                    width={page.display.width}
                    height={page.display.height}
                    words={words}
                  />
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
