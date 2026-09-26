import { useState } from 'react'
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

  return (
    <div className="app">
      <header className="top">
        <p className="eyebrow">Hong Kong</p>
        <h1>SafeShare MD</h1>
      </header>
      <main>
        {screen === 'home' ? <HomeScreen /> : null}
        {screen === 'review' ? <ReviewScreen /> : null}
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
