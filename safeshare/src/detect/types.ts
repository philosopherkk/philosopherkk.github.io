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

export type PageDetection = {
  detections: Detection[]
  zonesUncertain: boolean
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
