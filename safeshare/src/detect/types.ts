import type { Box } from '../ocr/boxes.ts'

export type DetectionCategory =
  | 'hkid'
  | 'passport'
  | 'phone'
  | 'email'
  | 'address'
  | 'date'
  | 'name'
  | 'record-number'
  | 'other-person'
  | 'organisation'
  | 'age'
  | 'sex'
  | 'low-confidence'
  | 'barcode'
  | 'face'

export type DetectionSource = 'pattern' | 'label' | 'propagation' | 'visual' | 'low-confidence'

export type Detection = {
  id: string
  bbox: Box
  category: DetectionCategory
  source: DetectionSource
  confidence: number
  enabled: boolean
}

export type DetectionDraft = Omit<Detection, 'id'>

export type ZoneName = 'header' | 'results' | 'footer'

export type ZoneBand = {
  y: number
  height: number
}

/** Pixel bands only. No recognized text. */
export type ZoneLayout = {
  pageWidth: number
  pageHeight: number
  uncertain: boolean
  /** Full-width results zone, including the gap between its first and last line. */
  resultsBand: ZoneBand | null
  /** Result-like rows only. Gaps between these stay covered in Results-only mode. */
  resultRows: ZoneBand[]
}

export type PageDetection = {
  detections: Detection[]
  zonesUncertain: boolean
  layout: ZoneLayout
}

export function stamp(
  drafts: readonly DetectionDraft[],
  pageIndex: number,
  prefix = '',
): Detection[] {
  return drafts.map((draft, index) => ({
    ...draft,
    id: `p${pageIndex}-${prefix}${index}`,
  }))
}
