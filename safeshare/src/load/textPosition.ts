/** A text run in original PDF page coordinates (origin at the bottom left). */
export type PageTextRun = {
  text: string
  x: number
  y: number
  width: number
  height: number
}

export type PdfTextItemLike = {
  str: string
  width: number
  height: number
  transform: readonly number[]
}

/**
 * Map one pdf.js text item to page space.
 * Call getTextContent without a viewport so the transform is not scaled to the canvas.
 */
export function pageTextFromItem(item: PdfTextItemLike): PageTextRun | null {
  const x = item.transform[4]
  const y = item.transform[5]
  if (typeof x !== 'number' || typeof y !== 'number') return null
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  if (!Number.isFinite(item.width) || !Number.isFinite(item.height)) return null
  return {
    text: item.str,
    x,
    y,
    width: item.width,
    height: item.height,
  }
}

export function pageTextFromItems(items: readonly PdfTextItemLike[]): PageTextRun[] {
  const runs: PageTextRun[] = []
  for (const item of items) {
    if (item.str.length === 0) continue
    const run = pageTextFromItem(item)
    if (run) runs.push(run)
  }
  return runs
}
