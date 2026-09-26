/** Code 128, set B. The bars encode the given text and nothing else. */

const PATTERNS = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213',
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132',
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211',
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313',
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331',
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111',
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214',
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111',
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141',
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141',
  '114131',
  '311141',
  '411131',
  '211412',
  '211214',
  '211232',
  '2331112',
] as const

const START_B = 104

export function code128Values(text: string): number[] {
  if (text.length === 0) throw new Error('empty-barcode')
  const values = [START_B]
  for (const char of text) {
    const code = char.charCodeAt(0)
    if (code < 32 || code > 126) throw new Error('barcode-charset')
    values.push(code - 32)
  }
  let sum = values[0] ?? 0
  for (let index = 1; index < values.length; index += 1) sum += index * (values[index] ?? 0)
  values.push(sum % 103)
  values.push(106)
  return values
}

export function code128Checksum(text: string): number {
  const values = code128Values(text)
  return values[values.length - 2] ?? 0
}

/** Module widths. Quiet zones are not included. */
export function code128Modules(text: string): number[] {
  const modules: number[] = []
  for (const value of code128Values(text)) {
    const pattern = PATTERNS[value]
    if (!pattern) throw new Error('barcode-pattern')
    for (const digit of pattern) modules.push(Number(digit))
  }
  return modules
}

export function code128Svg(text: string, module = 2, height = 78): string {
  const modules = code128Modules(text)
  const quiet = module * 10
  let x = quiet
  const bars: string[] = []
  for (let index = 0; index < modules.length; index += 1) {
    const width = (modules[index] ?? 0) * module
    if (index % 2 === 0) {
      bars.push(`<rect x="${x}" y="0" width="${width}" height="${height}" fill="#000"/>`)
    }
    x += width
  }
  const total = x + quiet
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${height}" viewBox="0 0 ${total} ${height}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/>${bars.join('')}</svg>`
}

export function code128PatternCount(): number {
  return PATTERNS.length
}

export function code128StartPattern(): string {
  return PATTERNS[START_B] ?? ''
}
