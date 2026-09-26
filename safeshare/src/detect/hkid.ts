const WEIGHTS = [9, 8, 7, 6, 5, 4, 3, 2]

function valueOf(ch: string): number {
  if (ch === ' ') return 36
  if (ch >= '0' && ch <= '9') return ch.charCodeAt(0) - 48
  return ch.charCodeAt(0) - 55
}

/** Expected check character for 1–2 letters plus 6 digits. Null when the body is not that shape. */
export function hkidCheckDigit(body: string): string | null {
  const compact = body.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const match = compact.match(/^([A-Z]{1,2})(\d{6})$/)
  if (!match) return null
  const letters = match[1] ?? ''
  const digits = match[2] ?? ''
  const chars = letters.length === 1 ? ` ${letters}${digits}` : `${letters}${digits}`
  if ([...chars].length !== 8) return null
  let sum = 0
  const pieces = [...chars]
  for (let i = 0; i < 8; i += 1) sum += valueOf(pieces[i] ?? ' ') * (WEIGHTS[i] ?? 0)
  const check = 11 - (sum % 11)
  if (check === 11) return '0'
  if (check === 10) return 'A'
  return String(check)
}

export function splitHkid(match: string): { body: string; check: string } | null {
  const compact = match.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const found = compact.match(/^([A-Z]{1,2}\d{6})([0-9A])$/)
  if (!found) return null
  return { body: found[1] ?? '', check: found[2] ?? '' }
}

/** Passed check raises confidence. A failed check still returns a positive score so the box stays on. */
export function hkidConfidence(body: string, check: string): number {
  const expected = hkidCheckDigit(body)
  if (expected !== null && expected === check.toUpperCase()) return 0.95
  return 0.62
}
