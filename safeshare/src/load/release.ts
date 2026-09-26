import type { LoadedDocument, LoadedPage } from './types.ts'

function closeBitmap(bitmap: ImageBitmap, closed: Set<ImageBitmap>): void {
  if (closed.has(bitmap)) return
  closed.add(bitmap)
  try {
    bitmap.close()
  } catch {
    // Already closed.
  }
}

export function releasePages(pages: readonly LoadedPage[]): void {
  const closed = new Set<ImageBitmap>()
  for (const page of pages) {
    closeBitmap(page.display, closed)
    if (page.exportBitmap) closeBitmap(page.exportBitmap, closed)
  }
}

export function releaseDocument(document: LoadedDocument): void {
  releasePages(document.pages)
}
