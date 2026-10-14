import { editDistance } from './editDistance.ts'
import { compactToken } from './labels.ts'
import { isMostlyDigits, normaliseToken } from './normalise.ts'
import type { DetectionDraft, ZoneName } from './types.ts'
import type { OcrWord } from '../ocr/types.ts'

export function nameTokensFrom(words: readonly OcrWord[]): string[] {
  const tokens: string[] = []
  for (const word of words) {
    const compact = compactToken(word.text)
    if ([...compact].length < 3) continue
    if (isMostlyDigits(word.text)) continue
    if (!/[A-Za-z\u4e00-\u9fff]/.test(compact)) continue
    tokens.push(compact)
  }
  return tokens
}

export function compactHkidToken(text: string): string {
  return normaliseToken(text)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function fuzzyName(word: string, token: string): boolean {
  const got = compactToken(word)
  if ([...got].length < 3 || [...token].length < 3) return false
  if (got === token) return true
  return editDistance(got, token) <= 1
}

function fuzzyHkid(word: string, id: string): boolean {
  const got = compactHkidToken(word)
  if (got.length < 7 || id.length < 7) return false
  if (got === id) return true
  return editDistance(got, id) <= 1
}

export function propagateTokens(
  words: readonly { word: OcrWord; zone: ZoneName }[],
  names: readonly string[],
  hkids: readonly string[],
): DetectionDraft[] {
  const drafts: DetectionDraft[] = []
  const uniqueNames = [...new Set(names)]
  const uniqueIds = [...new Set(hkids)]
  for (const item of words) {
    if (item.zone === 'results') continue
    if (uniqueNames.some((token) => fuzzyName(item.word.text, token))) {
      drafts.push({
        bbox: item.word.box,
        category: 'name',
        source: 'propagation',
        confidence: 0.75,
        enabled: true,
      })
    }
    if (uniqueIds.some((id) => fuzzyHkid(item.word.text, id))) {
      drafts.push({
        bbox: item.word.box,
        category: 'hkid',
        source: 'propagation',
        confidence: 0.75,
        enabled: true,
      })
    }
  }
  return drafts
}
