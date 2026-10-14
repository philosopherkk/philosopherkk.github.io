import type { GroupedWord } from './group.ts'

export type OcrWord = GroupedWord

export type PageOcr = {
  index: number
  /** Word boxes in Review-bitmap pixels. */
  words: OcrWord[]
  /**
   * Display pixels times this scale land on the export bitmap.
   * 1 when there is no larger export bitmap.
   */
  exportScale: number
}

export type OcrRun = {
  pages: PageOcr[]
  failed: boolean
}
