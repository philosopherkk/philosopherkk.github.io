import { useState } from 'react'
import { releaseDocument } from './load/release.ts'
import type { LoadedDocument } from './load/types.ts'
import { HomeScreen } from './screens/HomeScreen.tsx'
import { PrivacyScreen } from './screens/PrivacyScreen.tsx'
import { ReviewScreen } from './screens/ReviewScreen.tsx'

type Screen = 'home' | 'review' | 'privacy'

const NAV: { id: Screen; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'review', label: 'Review' },
  { id: 'privacy', label: 'Privacy' },
]

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [loaded, setLoaded] = useState<LoadedDocument | null>(null)

  function handleLoaded(next: LoadedDocument) {
    setLoaded((current) => {
      if (current) releaseDocument(current)
      return next
    })
    setScreen('review')
  }

  return (
    <div className="app">
      <header className="top">
        <p className="eyebrow">Hong Kong</p>
        <h1>SafeShare MD</h1>
      </header>
      <main>
        {screen === 'home' ? <HomeScreen onLoaded={handleLoaded} /> : null}
        {screen === 'review' ? <ReviewScreen document={loaded} /> : null}
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
