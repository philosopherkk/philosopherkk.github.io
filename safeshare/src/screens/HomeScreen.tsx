import { useRef, useState, type ChangeEvent } from 'react'
import { LoadFailure, loadErrorMessage } from '../load/classify.ts'
import { loadSelectedFile } from '../load/loadDocument.ts'
import type { LoadedDocument } from '../load/types.ts'

type HomeScreenProps = {
  onLoaded: (document: LoadedDocument) => void
}

export function HomeScreen({ onLoaded }: HomeScreenProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function readFile(file: File | undefined) {
    if (!file || busy) return
    setBusy(true)
    setError(null)
    setStatus('Reading the file on this phone.')
    try {
      const loaded = await loadSelectedFile(file)
      setStatus(null)
      onLoaded(loaded)
    } catch (caught) {
      const message =
        caught instanceof LoadFailure ? caught.message : loadErrorMessage('image-decode')
      setStatus(null)
      setError(message)
    } finally {
      setBusy(false)
      if (cameraRef.current) cameraRef.current.value = ''
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    void readFile(file)
  }

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
        disabled={busy}
        onClick={() => {
          cameraRef.current?.click()
        }}
      >
        Take photo
      </button>
      <button
        type="button"
        className="primary"
        disabled={busy}
        onClick={() => {
          fileRef.current?.click()
        }}
      >
        Choose image / PDF
      </button>
      <input
        ref={cameraRef}
        className="file-input"
        type="file"
        accept="image/*"
        capture="environment"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onPick}
      />
      <input
        ref={fileRef}
        className="file-input"
        type="file"
        accept="image/*,application/pdf,.pdf"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onPick}
      />
      {status ? <p role="status">{status}</p> : null}
      {error ? (
        <p role="alert" className="alert">
          {error}
        </p>
      ) : null}
      <p className="disclaimer">
        Automatic detection is not perfect. You are responsible for checking the image before
        sharing. This app does not give medical advice.
      </p>
    </section>
  )
}
