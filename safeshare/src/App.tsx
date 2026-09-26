import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { detectDocument } from './detect/run.ts'
import type { PageDetection } from './detect/types.ts'
import { clearLiveCanvases, revokeObjectUrls } from './export/cleanup.ts'
import { deliverFiles, type ShareHost } from './export/deliver.ts'
import { exportToken, type ExportFormat } from './export/names.ts'
import { renderExportFiles, saveDownload, type ShareRequest } from './export/render.ts'
import { LoadFailure, loadErrorMessage } from './load/classify.ts'
import { loadSelectedFile } from './load/loadDocument.ts'
import { releaseDocument } from './load/release.ts'
import type { LoadedDocument } from './load/types.ts'
import { OCR_FAILED, ocrProgressLabel } from './ocr/progress.ts'
import { recognizeDocument, releaseReader } from './ocr/recognize.ts'
import type { PageOcr } from './ocr/types.ts'
import type { ReviewMode } from './review/types.ts'
import { HomeScreen } from './screens/HomeScreen.tsx'
import { OnboardingScreen } from './screens/OnboardingScreen.tsx'
import { PrivacyScreen } from './screens/PrivacyScreen.tsx'
import { ProcessingScreen } from './screens/ProcessingScreen.tsx'
import { ReviewScreen, type SharePhase } from './screens/ReviewScreen.tsx'
import { SettingsScreen } from './screens/SettingsScreen.tsx'
import { listenForSharedFiles } from './share/inbox.ts'
import {
  detectionSettingsChanged,
  loadSettings,
  sanitizeSettings,
  saveSettings,
  type Settings,
} from './settings.ts'

type Screen = 'home' | 'processing' | 'review' | 'privacy' | 'settings'

const NAV: { id: Exclude<Screen, 'processing'>; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'review', label: 'Review' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'settings', label: 'Settings' },
]

export default function App() {
  const [settings, setSettings] = useState(loadSettings)
  const settingsRef = useRef(settings)
  const [screen, setScreen] = useState<Screen>('home')
  const [generation, setGeneration] = useState(0)
  const [loaded, setLoaded] = useState<LoadedDocument | null>(null)
  const [ocr, setOcr] = useState<PageOcr[] | null>(null)
  const [found, setFound] = useState<PageDetection[] | null>(null)
  const [openedMode, setOpenedMode] = useState<ReviewMode>(settings.defaultMode)
  const [progress, setProgress] = useState<string | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [phase, setPhase] = useState<SharePhase>('idle')
  const [shareError, setShareError] = useState<string | null>(null)
  const run = useRef(0)
  const detectGen = useRef(0)
  const exportRun = useRef(0)
  const active = useRef<LoadedDocument | null>(null)
  const ocrRef = useRef<PageOcr[] | null>(null)
  const detectionsRef = useRef<PageDetection[] | null>(null)
  const exportUrls = useRef<string[]>([])
  const sharing = useRef(false)
  const pendingShare = useRef<File | null>(null)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  function refreshDetection(doc: LoadedDocument, pages: readonly PageOcr[], next: Settings) {
    const token = ++detectGen.current
    const loadToken = run.current
    void detectDocument(doc, pages, next)
      .then((detected) => {
        if (detectGen.current !== token || run.current !== loadToken) return
        detectionsRef.current = detected
        setFound(detected)
      })
      .catch(() => {
        // Keep the boxes already on screen if a later pass fails.
      })
  }

  function commitSettings(next: Settings) {
    const prev = settingsRef.current
    const cleaned = sanitizeSettings(next)
    settingsRef.current = cleaned
    setSettings(cleaned)
    saveSettings(cleaned)
    if (!detectionSettingsChanged(prev, cleaned)) return
    const doc = active.current
    const pages = ocrRef.current
    if (!doc || !pages) return
    refreshDetection(doc, pages, cleaned)
  }

  function dropHeldUrls() {
    revokeObjectUrls(exportUrls.current)
    exportUrls.current = []
  }

  function forgetPages() {
    run.current += 1
    detectGen.current += 1
    exportRun.current += 1
    dropHeldUrls()
    clearLiveCanvases()
    const current = active.current
    active.current = null
    ocrRef.current = null
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

  const onShared = useEffectEvent((file: File) => {
    if (!settingsRef.current.disclaimerAccepted) {
      pendingShare.current = file
      return
    }
    acceptShared(file)
  })
  useEffect(() => listenForSharedFiles((file) => onShared(file)), [])

  function acceptDisclaimer() {
    commitSettings({ ...settingsRef.current, disclaimerAccepted: true })
    const file = pendingShare.current
    pendingShare.current = null
    if (file) acceptShared(file)
  }

  function handleLoaded(next: LoadedDocument) {
    const token = run.current + 1
    run.current = token
    const detectToken = ++detectGen.current
    setGeneration(token)
    setOpenedMode(settingsRef.current.defaultMode)
    dropHeldUrls()
    setPhase('idle')
    const previous = active.current
    active.current = next
    setLoaded(next)
    setOcr(null)
    setFound(null)
    setOcrError(null)
    ocrRef.current = null
    detectionsRef.current = null
    setScreen('processing')
    void recognizeDocument(next, (label) => {
      if (run.current === token) setProgress(label)
    }).then(async (result) => {
      if (run.current !== token) {
        releaseDocument(next)
        return
      }
      ocrRef.current = result.pages
      setProgress(ocrProgressLabel('finding', 0, result.pages.length))
      let detected: PageDetection[] | null
      try {
        detected = await detectDocument(next, result.pages, settingsRef.current)
      } catch {
        detected = null
      }
      if (run.current !== token) {
        releaseDocument(next)
        return
      }
      if (detectGen.current !== detectToken) return
      if (previous && previous !== next) releaseDocument(previous)
      detectionsRef.current = detected
      setFound(detected)
      setOcr(result.pages)
      setOcrError(result.failed ? OCR_FAILED : null)
      setProgress(null)
      setScreen('review')
    })
  }

  function updateOutput(next: { watermark?: boolean; outputFormat?: ExportFormat }) {
    commitSettings({ ...settingsRef.current, ...next })
  }

  const ready = settings.disclaimerAccepted

  return (
    <div className="app">
      <header className="top">
        <p className="eyebrow">Hong Kong</p>
        <h1>SafeShare MD</h1>
      </header>
      <main>
        {ready ? (
          <>
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
                initialMode={openedMode}
                watermark={settings.watermark}
                format={settings.outputFormat}
                error={ocrError}
                phase={phase}
                onOutputChange={updateOutput}
                onShare={handleShare}
                onDone={forgetPages}
              />
            </div>
            {screen === 'privacy' ? <PrivacyScreen /> : null}
            {screen === 'settings' ? (
              <SettingsScreen settings={settings} onChange={commitSettings} />
            ) : null}
          </>
        ) : (
          <OnboardingScreen onAccept={acceptDisclaimer} />
        )}
      </main>
      {ready ? (
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
      ) : null}
    </div>
  )
}
