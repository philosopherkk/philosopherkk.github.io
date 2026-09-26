import { useState } from 'react'

export function HomeScreen() {
  const [note, setNote] = useState<string | null>(null)

  return (
    <section className="stack">
      <p className="lead">
        Photograph a lab report, black out patient identifiers on this phone, then share the
        redacted image.
      </p>
      <p>For doctors in Hong Kong.</p>
      <button
        type="button"
        className="primary"
        onClick={() => {
          setNote('Photo capture is not connected yet. Nothing leaves this phone.')
        }}
      >
        Take photo
      </button>
      <button
        type="button"
        className="primary"
        onClick={() => {
          setNote('Choosing a file is not connected yet. Nothing leaves this phone.')
        }}
      >
        Choose image / PDF
      </button>
      {note ? <p role="status">{note}</p> : null}
      <p className="disclaimer">
        Automatic detection is not perfect. You are responsible for checking the image before
        sharing. This app does not give medical advice.
      </p>
    </section>
  )
}
