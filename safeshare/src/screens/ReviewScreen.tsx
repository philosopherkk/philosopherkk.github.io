import { useEffect, useRef, useState, type ComponentType } from 'react'
import type { Detection, PageDetection, ZoneLayout } from '../detect/types.ts'
import type { LoadedDocument } from '../load/types.ts'
import type { OcrWord } from '../ocr/types.ts'
import type { PageOcr } from '../ocr/types.ts'
import {
  boxesForMode,
  formatCategoryCounts,
  lowOverallConfidence,
  missingNameOrId,
} from '../review/modes.ts'
import { toggleById } from '../review/hitTest.ts'
import type { ReviewBox, ReviewMode } from '../review/types.ts'
import { ReviewStage } from './ReviewStage.tsx'

type DevToggle = ComponentType<{ show: boolean; onChange: (show: boolean) => void }>
type DevOverlay = ComponentType<{
  width: number
  height: number
  words: readonly OcrWord[]
}>

const MODES: readonly { id: ReviewMode; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'header-blackout', label: 'Header blackout' },
  { id: 'results-only', label: 'Results only' },
  { id: 'manual', label: 'Manual' },
]

type PageEdit = {
  detections: Detection[]
  layout: ZoneLayout
  drawn: ReviewBox[]
  disabledZones: string[]
}

type ReviewScreenProps = {
  document: LoadedDocument | null
  ocr: readonly PageOcr[] | null
  found: readonly PageDetection[] | null
  initialMode: ReviewMode
  error: string | null
}

function emptyLayout(width: number, height: number): ZoneLayout {
  return {
    pageWidth: Math.max(1, width),
    pageHeight: Math.max(1, height),
    uncertain: true,
    resultsBand: null,
    resultRows: [],
  }
}

export function ReviewScreen({ document, ocr, found, initialMode, error }: ReviewScreenProps) {
  const [showBoxes, setShowBoxes] = useState(false)
  const [DevToggle, setDevToggle] = useState<DevToggle | null>(null)
  const [DevOverlay, setDevOverlay] = useState<DevOverlay | null>(null)
  const [mode, setMode] = useState<ReviewMode>(initialMode)
  const [edits, setEdits] = useState<PageEdit[] | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [confirmed, setConfirmed] = useState(false)
  const [peeking, setPeeking] = useState(false)
  const [source, setSource] = useState({ document, found, initialMode })
  const drawnIds = useRef(0)
  if (
    source.document !== document ||
    source.found !== found ||
    source.initialMode !== initialMode
  ) {
    setSource({ document, found, initialMode })
    setMode(initialMode)
    setConfirmed(false)
    setPageIndex(0)
    setPeeking(false)
    setEdits(
      document
        ? document.pages.map((page, index) => ({
            detections: found?.[index]?.detections ?? [],
            layout: found?.[index]?.layout ?? emptyLayout(page.display.width, page.display.height),
            drawn: [],
            disabledZones: [],
          }))
        : null,
    )
  }

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
  const safeIndex = Math.min(pageIndex, count - 1)
  const page = document.pages[safeIndex]
  const edit = edits?.[safeIndex]
  const words = ocr?.find((item) => item.index === page?.index)?.words ?? []
  const visible =
    page && edit
      ? boxesForMode(mode, edit.detections, edit.drawn, edit.layout, new Set(edit.disabledZones))
      : []
  const low = lowOverallConfidence(words.map((word) => ({ confidence: word.confidence })))
  const missing = missingNameOrId(edit?.detections ?? [])

  function updatePage(index: number, change: (page: PageEdit) => PageEdit) {
    setEdits(
      (current) =>
        current?.map((item, itemIndex) => (itemIndex === index ? change(item) : item)) ?? current,
    )
  }

  function toggle(id: string) {
    updatePage(safeIndex, (item) => {
      if (item.drawn.some((box) => box.id === id))
        return { ...item, drawn: toggleById(item.drawn, id) }
      if (item.detections.some((box) => box.id === id)) {
        return { ...item, detections: toggleById(item.detections, id) }
      }
      const disabled = new Set(item.disabledZones)
      if (disabled.has(id)) disabled.delete(id)
      else disabled.add(id)
      return { ...item, disabledZones: [...disabled] }
    })
  }

  function addBox(bbox: ReviewBox['bbox']) {
    drawnIds.current += 1
    const box: ReviewBox = {
      id: `drawn-${safeIndex}-${drawnIds.current}`,
      bbox,
      category: 'drawn',
      enabled: true,
      origin: 'drawn',
    }
    updatePage(safeIndex, (item) => ({ ...item, drawn: [...item.drawn, box] }))
  }

  function chooseMode(next: ReviewMode) {
    setMode(next)
    setEdits((current) => current?.map((item) => ({ ...item, disabledZones: [] })) ?? current)
  }

  return (
    <section className="review">
      <div className="review-head">
        <h2>Review</h2>
        <p>{count === 1 ? '1 page' : `${count} pages`} loaded on this phone. Nothing is saved.</p>
        {error ? (
          <p role="alert" className="alert">
            {error}
          </p>
        ) : null}
        {DevToggle ? <DevToggle show={showBoxes} onChange={setShowBoxes} /> : null}
      </div>
      {page ? (
        <div className="page-frame">
          <ReviewStage
            bitmap={page.display}
            label={`Page ${page.index + 1}`}
            boxes={visible}
            peeking={peeking}
            onToggle={toggle}
            onDraw={addBox}
          />
          {DevOverlay && showBoxes ? (
            <DevOverlay width={page.display.width} height={page.display.height} words={words} />
          ) : null}
        </div>
      ) : null}
      <div className="review-dock">
        <div className="review-tools">
          {count > 1 ? (
            <div className="pager">
              <button
                type="button"
                disabled={safeIndex === 0}
                onClick={() => setPageIndex(safeIndex - 1)}
              >
                Previous page
              </button>
              <button
                type="button"
                disabled={safeIndex >= count - 1}
                onClick={() => setPageIndex(safeIndex + 1)}
              >
                Next page
              </button>
            </div>
          ) : null}
          <div className="modes" role="group" aria-label="Redaction mode">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={mode === item.id}
                onClick={() => chooseMode(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={peeking}
            onPointerDown={(event) => {
              event.preventDefault()
              event.currentTarget.setPointerCapture(event.pointerId)
              setPeeking(true)
            }}
            onPointerUp={() => setPeeking(false)}
            onPointerCancel={() => setPeeking(false)}
            onLostPointerCapture={() => setPeeking(false)}
          >
            Peek
          </button>
          <p className="counts">{formatCategoryCounts(visible)}</p>
          {low ? <p className="banner">Text confidence is low. Check the page carefully.</p> : null}
          {missing ? <p className="banner">Nothing detected — please check carefully</p> : null}
          {edit?.layout.uncertain ? (
            <p className="banner">
              Page regions were not found. The whole page is treated as the header.
            </p>
          ) : null}
        </div>
        <div className="review-confirm">
          <label className="check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => {
                setConfirmed(event.target.checked)
              }}
            />
            <span>I have checked that no patient identifiers are visible</span>
          </label>
          <button type="button" className="primary" disabled={!confirmed}>
            Share
          </button>
        </div>
      </div>
    </section>
  )
}
