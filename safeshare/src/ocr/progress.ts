export type OcrPhase = 'loading' | 'reading'

export const OCR_FAILED = 'The text could not be read. Try another photo.'

/** Fixed copy. Never include a file name, OCR text, or image bytes. */
export function ocrProgressLabel(phase: OcrPhase, pageIndex: number, pageCount: number): string {
  if (phase === 'loading') return 'Loading the reader.'
  if (pageCount <= 1) return 'Reading text.'
  const page = Math.min(pageCount, Math.max(1, pageIndex + 1))
  return `Reading text, page ${page} of ${pageCount}.`
}
