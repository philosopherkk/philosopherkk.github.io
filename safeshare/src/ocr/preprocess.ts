/**
 * OCR input only. The Review bitmap and the export bitmap are not modified.
 * Grayscale uses Rec. 709. Contrast stretches the 2nd–98th percentile to 0–255.
 * Deskew is not applied: a stable deskew needs a new dependency, so the page
 * stays unrotated and OCR boxes stay in this image's pixel space.
 */

export function grayscale(rgba: Uint8ClampedArray): Uint8Array {
  const count = Math.floor(rgba.length / 4)
  const gray = new Uint8Array(count)
  for (let index = 0; index < count; index += 1) {
    const offset = index * 4
    const red = rgba[offset] ?? 0
    const green = rgba[offset + 1] ?? 0
    const blue = rgba[offset + 2] ?? 0
    gray[index] = Math.round(0.2126 * red + 0.7152 * green + 0.0722 * blue)
  }
  return gray
}

export function contrastStretch(gray: Uint8Array): Uint8Array {
  const out = new Uint8Array(gray.length)
  if (gray.length === 0) return out
  const hist = new Uint32Array(256)
  for (const value of gray) hist[value] = (hist[value] ?? 0) + 1
  const tail = gray.length * 0.02
  let low = 0
  let seen = 0
  for (let value = 0; value < 256; value += 1) {
    seen += hist[value] ?? 0
    if (seen >= tail) {
      low = value
      break
    }
  }
  let high = 255
  seen = 0
  for (let value = 255; value >= 0; value -= 1) {
    seen += hist[value] ?? 0
    if (seen >= tail) {
      high = value
      break
    }
  }
  if (high <= low) {
    out.set(gray)
    return out
  }
  const scale = 255 / (high - low)
  for (let index = 0; index < gray.length; index += 1) {
    const stretched = Math.round(((gray[index] ?? 0) - low) * scale)
    out[index] = stretched < 0 ? 0 : stretched > 255 ? 255 : stretched
  }
  return out
}

/** Opaque grayscale RGBA. Same width and height as the source. */
export function prepareOcrPixels(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const gray = contrastStretch(grayscale(rgba))
  const out = new Uint8ClampedArray(gray.length * 4)
  for (let index = 0; index < gray.length; index += 1) {
    const value = gray[index] ?? 0
    const offset = index * 4
    out[offset] = value
    out[offset + 1] = value
    out[offset + 2] = value
    out[offset + 3] = 255
  }
  return out
}
