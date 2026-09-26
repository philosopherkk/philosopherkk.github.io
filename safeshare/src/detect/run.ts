import { detectText } from './engine.ts'
import { mergeAndPad } from './merge.ts'
import { stamp, type PageDetection } from './types.ts'
import { detectVisual } from './visual.ts'
import type { LoadedDocument } from '../load/types.ts'
import type { PageOcr } from '../ocr/types.ts'
import type { Settings } from '../settings.ts'

/** OCR words plus the review bitmap. Results stay in memory; nothing is written to storage. */
export async function detectDocument(
  document: LoadedDocument,
  ocrPages: readonly PageOcr[],
  settings: Settings,
): Promise<PageDetection[]> {
  const words = document.pages.map(
    (page) => ocrPages.find((item) => item.index === page.index)?.words ?? [],
  )
  const text = detectText(words, settings)
  const visual = await Promise.all(
    document.pages.map(async (page) => {
      try {
        return await detectVisual(page.display)
      } catch {
        return []
      }
    }),
  )
  return text.map((page, index) => ({
    zonesUncertain: page.zonesUncertain,
    detections: mergeAndPad([...page.detections, ...stamp(visual[index] ?? [], index, 'v')]),
  }))
}
