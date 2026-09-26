import type { PageTextRun } from './textPosition.ts'

export type LoadedPage = {
  index: number
  /** Longest side ≤ 2500. This is what Review shows and later processing uses. */
  display: ImageBitmap
  /** Original-resolution bitmap when its longest side is ≤ 3000. Otherwise null. */
  exportBitmap: ImageBitmap | null
  /** Embedded PDF text in page coordinates. Empty for images. */
  text: PageTextRun[]
}

export type LoadedDocument = {
  kind: 'image' | 'pdf'
  pages: LoadedPage[]
}
