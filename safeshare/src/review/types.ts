import type { Box } from '../ocr/boxes.ts'
import type { DetectionCategory } from '../detect/types.ts'

export type ReviewMode = 'standard' | 'header-blackout' | 'results-only' | 'manual'

export type ReviewCategory = DetectionCategory | 'drawn' | 'header' | 'footer' | 'gap'

export type ReviewOrigin = 'detection' | 'zone' | 'drawn'

export type ReviewBox = {
  id: string
  bbox: Box
  category: ReviewCategory
  enabled: boolean
  origin: ReviewOrigin
}

export type Point = {
  x: number
  y: number
}

export type View = {
  scale: number
  x: number
  y: number
}
