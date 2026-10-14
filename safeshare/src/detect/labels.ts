import { editDistance } from './editDistance.ts'
import type { DetectionCategory } from './types.ts'
import type { Settings } from '../settings.ts'

export type LabelKind =
  | 'name'
  | 'id'
  | 'record'
  | 'dob'
  | 'phone'
  | 'email'
  | 'address'
  | 'doctor'
  | 'organisation'
  | 'age'
  | 'sex'
  | 'passport'

type LabelDef = {
  kind: LabelKind
  parts: readonly string[]
}

const PHRASES: readonly { kind: LabelKind; text: string }[] = [
  { kind: 'name', text: 'patient name' },
  { kind: 'name', text: 'pt name' },
  { kind: 'name', text: 'patient' },
  { kind: 'name', text: 'name' },
  { kind: 'name', text: '姓名' },
  { kind: 'name', text: '病人姓名' },
  { kind: 'name', text: '病人' },
  { kind: 'id', text: 'identity card no' },
  { kind: 'id', text: 'identity card' },
  { kind: 'id', text: 'hkid no' },
  { kind: 'id', text: 'i.d. no' },
  { kind: 'id', text: 'id no' },
  { kind: 'id', text: 'h.k.i.d.' },
  { kind: 'id', text: 'hkid' },
  { kind: 'id', text: 'hkic' },
  { kind: 'id', text: 'i.d.' },
  { kind: 'id', text: '身份證號碼' },
  { kind: 'id', text: '身份證' },
  { kind: 'id', text: '身份証' },
  { kind: 'record', text: 'hospital no' },
  { kind: 'record', text: 'patient no' },
  { kind: 'record', text: 'episode no' },
  { kind: 'record', text: 'accession no' },
  { kind: 'record', text: 'specimen id' },
  { kind: 'record', text: 'sample id' },
  { kind: 'record', text: 'case no' },
  { kind: 'record', text: 'lab no' },
  { kind: 'record', text: 'lab id' },
  { kind: 'record', text: 'ha no' },
  { kind: 'record', text: 'ref no' },
  { kind: 'record', text: 'visit no' },
  { kind: 'record', text: 'accession' },
  { kind: 'record', text: 'episode' },
  { kind: 'record', text: 'mrn' },
  { kind: 'record', text: 'hn' },
  { kind: 'record', text: 'bed' },
  { kind: 'record', text: 'ward' },
  { kind: 'record', text: 'room' },
  { kind: 'record', text: '病人編號' },
  { kind: 'record', text: '醫院編號' },
  { kind: 'record', text: '化驗編號' },
  { kind: 'dob', text: 'date of birth' },
  { kind: 'dob', text: 'birth date' },
  { kind: 'dob', text: 'd.o.b' },
  { kind: 'dob', text: 'dob' },
  { kind: 'dob', text: '出生日期' },
  { kind: 'phone', text: 'tel no' },
  { kind: 'phone', text: 'phone' },
  { kind: 'phone', text: 'mobile' },
  { kind: 'phone', text: 'tel' },
  { kind: 'phone', text: '電話' },
  { kind: 'email', text: 'email' },
  { kind: 'email', text: '電郵' },
  { kind: 'address', text: 'address' },
  { kind: 'address', text: '地址' },
  { kind: 'doctor', text: 'referring doctor' },
  { kind: 'doctor', text: 'requested by' },
  { kind: 'doctor', text: 'ordered by' },
  { kind: 'doctor', text: 'clinician' },
  { kind: 'doctor', text: 'doctor' },
  { kind: 'doctor', text: 'dr' },
  { kind: 'doctor', text: '主診醫生' },
  { kind: 'doctor', text: '醫生' },
  { kind: 'organisation', text: 'hospital authority' },
  { kind: 'organisation', text: 'hospital' },
  { kind: 'organisation', text: 'clinic' },
  { kind: 'organisation', text: 'ha' },
  { kind: 'organisation', text: '醫院' },
  { kind: 'organisation', text: '診所' },
  { kind: 'age', text: 'age' },
  { kind: 'age', text: '年齡' },
  { kind: 'sex', text: 'gender' },
  { kind: 'sex', text: 'sex' },
  { kind: 'sex', text: '性別' },
  { kind: 'passport', text: 'passport' },
  { kind: 'passport', text: '護照' },
]

const LABELS: readonly LabelDef[] = PHRASES.map((phrase) => ({
  kind: phrase.kind,
  parts: phrase.text.split(' '),
}))

export type LabelHit = {
  kind: LabelKind
  start: number
  end: number
}

export function compactToken(raw: string): string {
  return raw
    .replace(/[.:：。．,，]+$/u, '')
    .replace(/[.\s]/g, '')
    .toLowerCase()
}

function tokenMatches(word: string, labelToken: string): boolean {
  const got = compactToken(word)
  const want = compactToken(labelToken)
  if (!got || !want) return false
  if (got === want) return true
  if ([...want].length > 4 && editDistance(got, want) <= 1) return true
  return false
}

export function matchLabelAt(words: readonly string[], start: number): LabelHit | null {
  let best: LabelHit | null = null
  let bestSpan = 0
  let bestLength = 0
  for (const label of LABELS) {
    if (start + label.parts.length > words.length) continue
    let ok = true
    for (let i = 0; i < label.parts.length; i += 1) {
      if (!tokenMatches(words[start + i] ?? '', label.parts[i] ?? '')) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const span = label.parts.length
    const length = label.parts.join('').length
    if (span > bestSpan || (span === bestSpan && length > bestLength)) {
      best = { kind: label.kind, start, end: start + span }
      bestSpan = span
      bestLength = length
    }
  }
  return best
}

export function labelsInWords(words: readonly string[]): LabelHit[] {
  const hits: LabelHit[] = []
  let index = 0
  while (index < words.length) {
    const hit = matchLabelAt(words, index)
    if (hit) {
      hits.push(hit)
      index = hit.end
    } else {
      index += 1
    }
  }
  return hits
}

export function categoryForLabel(kind: LabelKind): DetectionCategory {
  switch (kind) {
    case 'name':
      return 'name'
    case 'id':
      return 'hkid'
    case 'record':
      return 'record-number'
    case 'dob':
      return 'date'
    case 'phone':
      return 'phone'
    case 'email':
      return 'email'
    case 'address':
      return 'address'
    case 'doctor':
      return 'other-person'
    case 'organisation':
      return 'organisation'
    case 'age':
      return 'age'
    case 'sex':
      return 'sex'
    case 'passport':
      return 'passport'
  }
}

export function labelRedactionEnabled(kind: LabelKind, settings: Settings): boolean {
  if (kind === 'doctor') return settings.redactDoctorNames
  if (kind === 'organisation') return settings.redactOrganisationNames
  if (kind === 'age') return settings.redactAge
  if (kind === 'sex') return settings.redactSex
  return true
}
