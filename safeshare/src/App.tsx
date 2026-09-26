import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { detectDocument } from './detect/run.ts'
import type { PageDetection } from './detect/types.ts'
import { clearLiveCanvases, revokeObjectUrls } from './export/cleanup.ts'
import { deliverFiles, type ShareHost } from './export/deliver.ts'
import { exportToken } from './export/names.ts'
import { renderExportFiles, saveDownload, type ShareRequest } from './export/render.ts'
import { LoadFailure, loadErrorMessage } from './load/classify.ts'
import { loadSelectedFile } from './load/loadDocument.ts'
import { releaseDocument } from './load/release.ts'
import type { LoadedDocument } from './load/types.ts'
import { OCR_FAILED, ocrProgressLabel } from './ocr/progress.ts'
import { recognizeDocument, releaseReader } from './ocr/recognize.ts'
import type { PageOcr } from './ocr/types.ts'
import { HomeScreen } from './screens/HomeScreen.tsx'
import { PrivacyScreen } from './screens/PrivacyScreen.tsx'
import { ProcessingScreen } from './screens/ProcessingScreen.tsx'
import { ReviewScreen, type SharePhase } from './screens/ReviewScreen.tsx'
import { listenForSharedFiles } from './share/inbox.ts'
import { loadSettings } from './settings.ts'

type Screen = 'home' | 'processing' | 'review' | 'privacy'

const NAV: { id: Exclude<Screen, 'processing'>; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'review', label: 'Review' },
  { id: 'privacy', label: 'Privacy' },
]

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [generation, setGeneration] = useState(0)
  const [loaded, setLoaded] = useState<LoadedDocument | null>(null)
  const [ocr, setOcr] = useState<PageOcr[] | null>(null)
  const [found, setFound] = useState<PageDetection[] | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [phase, setPhase] = useState<SharePhase>('idle')
  const [shareError, setShareError] = useState<string | null>(null)
  const run = useRef(0)
  const exportRun = useRef(0)
  const active = useRef<LoadedDocument | null>(null)
  const detectionsRef = useRef<PageDetection[] | null>(null)
  const exportUrls = useRef<string[]>([])
  const sharing = useRef(false)

  function dropHeldUrls() {
    revokeObjectUrls(exportUrls.current)
    exportUrls.current = []
  }

  function forgetPages() {
    exportRun.current += 1
    dropHeldUrls()
    clearLiveCanvases()
    const current = active.current
    active.current = null
    if (current) releaseDocument(current)
    detectionsRef.current = null
    setLoaded(null)
    setOcr(null)
    setFound(null)
    setOcrError(null)
    setProgress(null)
    setPhase('idle')
    setGeneration((value) => value + 1)
    setScreen('home')
    void releaseReader()
  }

  function shareHost(): ShareHost {
    const canShare = navigator.canShare
    const share = navigator.share
    return {
      canShare:
        typeof canShare === 'function'
          ? (data) => canShare.call(navigator, data) === true
          : undefined,
      share: typeof share === 'function' ? (data) => share.call(navigator, data) : undefined,
    }
  }

  function handleShare(request: ShareRequest) {
    if (sharing.current) return
    sharing.current = true
    const token = exportRun.current
    setPhase('busy')
    const name = exportToken()
    void renderExportFiles(request.pages, name, request.format, request.watermark)
      .then((files) => deliverFiles(files, name, shareHost(), saveDownload))
      .then((result) => {
        if (exportRun.current !== token) {
          revokeObjectUrls(result.urls)
          return
        }
        if (result.outcome === 'shared' || result.outcome === 'dismissed') {
          forgetPages()
          return
        }
        exportUrls.current = result.urls
        setPhase(result.outcome === 'downloaded' ? 'downloaded' : 'failed')
      })
      .catch(() => {
        if (exportRun.current === token) setPhase('failed')
      })
      .finally(() => {
        sharing.current = false
      })
  }

  function acceptShared(file: File) {
    void loadSelectedFile(file)
      .then((next) => {
        setShareError(null)
        handleLoaded(next)
      })
      .catch((caught: unknown) => {
        const message =
          caught instanceof LoadFailure ? caught.message : loadErrorMessage('image-decode')
        setShareError(message)
        setScreen('home')
      })
  }

  const onShared = useEffectEvent(acceptShared)
  useEffect(() => listenForSharedFiles((file) => onShared(file)), [])

  function handleLoaded(next: LoadedDocument) {
    const token = run.current + 1
    run.current = token
    setGeneration(token)
    dropHeldUrls()
    setPhase('idle')
    const previous = active.current
    active.current = next
    setLoaded(next)
    setOcr(null)
    setFound(null)
    setOcrError(null)
    detectionsRef.current = null
    setScreen('processing')
    void recognizeDocument(next, (label) => {
      if (run.current === token) setProgress(label)
    }).then(async (result) => {
      if (run.current !== token) {
        releaseDocument(next)
        return
      }
      setProgress(ocrProgressLabel('finding', 0, result.pages.length))
      let detected: PageDetection[] | null
      try {
        detected = await detectDocument(next, result.pages, loadSettings())
      } catch {
        detected = null
      }
      if (run.current !== token) {
        releaseDocument(next)
        return
      }
      if (previous && previous !== next) releaseDocument(previous)
      detectionsRef.current = detected
      setFound(detected)
      setOcr(result.pages)
      setOcrError(result.failed ? OCR_FAILED : null)
      setProgress(null)
      setScreen('review')
    })
  }

  return (
    <div className="app">
      <header className="top">
        <p className="eyebrow">Hong Kong</p>
        <h1>SafeShare MD</h1>
      </header>
      <main>
        {screen === 'home' ? (
          <HomeScreen onLoaded={handleLoaded} externalError={shareError} />
        ) : null}
        {screen === 'processing' ? (
          <ProcessingScreen label={progress ?? 'Loading the reader.'} />
        ) : null}
        <div className="review-mount" hidden={screen !== 'review'}>
          <ReviewScreen
            key={loaded ? generation : 'empty'}
            document={loaded}
            ocr={ocr}
            found={found}
            initialMode={loadSettings().defaultMode}
            error={ocrError}
            phase={phase}
            onShare={handleShare}
            onDone={forgetPages}
          />
        </div>
        {screen === 'privacy' ? <PrivacyScreen /> : null}
      </main>
      <nav aria-label="Screens">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={screen === item.id ? 'page' : undefined}
            onClick={() => {
              setScreen(item.id)
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
