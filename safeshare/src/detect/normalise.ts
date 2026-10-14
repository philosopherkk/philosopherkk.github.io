/**
 * Digit-like OCR map. Applied only when the token is mostly digits.
 * O/o→0, I/l/|→1, S/s→5, B/b→8, Z/z→2.
 */
const DIGIT_LIKE: Record<string, string> = {
  O: '0',
  o: '0',
  I: '1',
  l: '1',
  '|': '1',
  S: '5',
  s: '5',
  B: '8',
  b: '8',
  Z: '2',
  z: '2',
}

export function isMostlyDigits(token: string): boolean {
  let digits = 0
  let alnum = 0
  for (const ch of token) {
    if (ch >= '0' && ch <= '9') {
      digits += 1
      alnum += 1
    } else if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z')) {
      alnum += 1
    }
  }
  return alnum > 0 && digits * 2 > alnum
}

export function normaliseToken(token: string): string {
  if (!isMostlyDigits(token)) return token
  let out = ''
  for (const ch of token) out += DIGIT_LIKE[ch] ?? ch
  return out
}
