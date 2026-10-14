export function revokeObjectUrls(urls: readonly string[]): void {
  for (const url of urls) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // Already revoked.
    }
  }
}

/** Drop pixel buffers held by canvases still on the page. */
export function clearLiveCanvases(): void {
  if (typeof document === 'undefined') return
  for (const canvas of document.querySelectorAll('canvas')) {
    const context = canvas.getContext('2d')
    if (context) context.clearRect(0, 0, canvas.width, canvas.height)
    canvas.width = 0
    canvas.height = 0
  }
}
