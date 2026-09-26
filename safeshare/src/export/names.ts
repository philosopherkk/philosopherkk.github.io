/** SPEC §7. Names are random. They are never built from a file, OCR text, or patient data. */

export const JPEG_QUALITY = 0.9
export const WATERMARK_TEXT = 'De-identified · For clinical discussion only'

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

export type ExportFormat = 'jpeg' | 'png'

export function exportMime(format: ExportFormat): 'image/jpeg' | 'image/png' {
  return format === 'png' ? 'image/png' : 'image/jpeg'
}

export function exportExtension(format: ExportFormat): 'jpg' | 'png' {
  return format === 'png' ? 'png' : 'jpg'
}

/** Six characters from a caller-supplied unit random source. Production passes Math.random. */
export function exportToken(random: () => number = Math.random): string {
  let token = ''
  for (let index = 0; index < 6; index += 1) {
    const unit = random()
    const pick = Number.isFinite(unit) ? Math.floor(unit * ALPHABET.length) : 0
    const clamped = Math.min(ALPHABET.length - 1, Math.max(0, pick))
    token += ALPHABET[clamped] ?? 'a'
  }
  return token
}

/** 1-based page number. The token is the only varying secret, and it is not from the page. */
export function exportFileName(pageNumber: number, token: string, format: ExportFormat): string {
  const page = Math.max(1, Math.floor(pageNumber))
  return `report-redacted-${token}-p${page}.${exportExtension(format)}`
}

export function exportZipName(token: string): string {
  return `report-redacted-${token}.zip`
}
