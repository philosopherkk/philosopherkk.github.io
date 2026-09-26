import { useRef, useState } from 'react'
import { detectDocument } from './detect/run.ts'
import type { PageDetection } from './detect/types.ts'
import { releaseDocument } from './load/release.ts'
import type { LoadedDocument } from './load/types.ts'
import { OCR_FAILED, ocrProgressLabel } from './ocr/progress.ts'
import { recognizeDocument } from './ocr/recognize.ts'
import type { PageOcr } from './ocr/types.ts'
import { HomeScreen } from './screens/HomeScreen.tsx'
import { PrivacyScreen } from './screens/PrivacyScreen.tsx'
import { ProcessingScreen } from './screens/ProcessingScreen.tsx'
import { ReviewScreen } from './screens/ReviewScreen.tsx'
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
  const run = useRef(0)
  const active = useRef<LoadedDocument | null>(null)
  const detectionsRef = useRef<PageDetection[] | null>(null)

  function handleLoaded(next: LoadedDocument) {
    const token = run.current + 1
    run.current = token
    setGeneration(token)
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
        {screen === 'home' ? <HomeScreen onLoaded={handleLoaded} /> : null}
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
