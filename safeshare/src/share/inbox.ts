export type SharedPayload = {
  name: string
  type: string
  buffer: ArrayBuffer
}

function payloadFile(data: unknown): File | null {
  if (!data || typeof data !== 'object') return null
  const record = data as { type?: unknown; file?: unknown }
  if (record.type !== 'safeshare-shared' || !record.file || typeof record.file !== 'object') {
    return null
  }
  const file = record.file as { name?: unknown; type?: unknown; buffer?: unknown }
  if (!(file.buffer instanceof ArrayBuffer)) return null
  const name = typeof file.name === 'string' && file.name ? file.name : 'shared'
  const type = typeof file.type === 'string' ? file.type : ''
  return new File([file.buffer], name, { type })
}

/** Ask the service worker for a shared file, then tell it to drop the bytes. */
export function listenForSharedFiles(onFile: (file: File) => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {}
  const sw = navigator.serviceWorker
  let stopped = false
  const pull = () => {
    if (stopped) return
    sw.controller?.postMessage({ type: 'safeshare-pull' })
  }
  const onMessage = (event: MessageEvent) => {
    const file = payloadFile(event.data)
    if (!file) return
    sw.controller?.postMessage({ type: 'safeshare-ack' })
    onFile(file)
  }
  sw.addEventListener('message', onMessage)
  sw.addEventListener('controllerchange', pull)
  void sw.ready.then(pull)
  pull()
  return () => {
    stopped = true
    sw.removeEventListener('message', onMessage)
    sw.removeEventListener('controllerchange', pull)
  }
}
