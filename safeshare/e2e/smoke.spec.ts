import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateSync, inflateSync } from 'node:zlib'
import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('privacy screen and touch target', async ({ page }) => {
  await page.goto('/safeshare/')
  await expect(page).toHaveTitle('SafeShare MD')
  await expect(page.getByRole('heading', { level: 1, name: 'SafeShare MD' })).toBeVisible()

  const privacy = page.getByRole('button', { name: 'Privacy' })
  await privacy.click()
  await expect(
    page.getByText('Nothing leaves your phone except the redacted image you choose to share.'),
  ).toBeVisible()
  await expect(page.getByText(/airplane mode/i)).toBeVisible()

  const box = await privacy.boundingBox()
  if (!box) throw new Error('Privacy button has no box')
  expect(box.height).toBeGreaterThanOrEqual(44)
  expect(box.width).toBeGreaterThanOrEqual(44)
})

test('picker error paths stay on the page and hide the file name', async ({ page }) => {
  const pageErrors: string[] = []
  const leaked: string[] = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })
  page.on('request', (request) => {
    const url = new URL(request.url())
    const sameOrigin = url.origin === 'http://127.0.0.1:4173'
    if (request.method() !== 'GET' || !sameOrigin) {
      leaked.push(`${request.method()} ${request.url()}`)
    }
  })

  await page.goto('/safeshare/')
  await page.getByRole('button', { name: 'Home' }).click()

  const rejectedName = 'patient-chan-report.heic'
  const cameraChooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Take photo', exact: true }).click()
  await (
    await cameraChooser
  ).setFiles({
    name: rejectedName,
    mimeType: 'image/heic',
    buffer: Buffer.from('not-a-photo'),
  })

  const alert = page.getByRole('alert')
  await expect(alert).toBeVisible()
  const imageError = await alert.innerText()
  expect(imageError).toContain('could not be read')
  expect(imageError).not.toContain(rejectedName)
  expect(imageError.toLowerCase()).not.toContain('patient')
  expect(imageError).not.toContain('not-a-photo')
  await expect(page).toHaveTitle('SafeShare MD')
  expect(page.url()).not.toContain('patient')
  expect(page.url()).not.toContain('.heic')

  const plainName = 'Chan-Tai-Man.txt'
  const fileChooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose image / PDF', exact: true }).click()
  await (
    await fileChooser
  ).setFiles({
    name: plainName,
    mimeType: 'text/plain',
    buffer: Buffer.from('hello secret text'),
  })
  await expect(alert).toContainText('not supported')
  const typeError = await alert.innerText()
  expect(typeError).not.toContain(plainName)
  expect(typeError).not.toContain('Chan')
  expect(typeError).not.toContain('hello')
  expect(pageErrors).toEqual([])
  expect(leaked).toEqual([])
})

function onePagePdf(): Buffer {
  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  const add = (content: string) => {
    offsets.push(body.length)
    body += `${offsets.length} 0 obj\n${content}\nendobj\n`
  }
  const stream = 'BT /F1 12 Tf 20 100 Td (ABC) Tj ET'
  add('<< /Type /Catalog /Pages 2 0 R >>')
  add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  add(
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
  )
  add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const xrefAt = body.length
  let xref = 'xref\n0 6\n0000000000 65535 f \n'
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  body += `${xref}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`
  return Buffer.from(body)
}

test('a chosen image opens on the review screen', async ({ page }) => {
  test.setTimeout(120000)
  const pageErrors: string[] = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })
  await page.goto('/safeshare/')

  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose image / PDF', exact: true }).click()
  await (
    await chooser
  ).setFiles({
    name: 'page.png',
    mimeType: 'image/png',
    buffer: TINY_PNG,
  })

  await expect(page.getByRole('heading', { level: 2, name: 'Review' })).toBeVisible({
    timeout: 90000,
  })
  await expect(page.getByRole('img', { name: 'Page 1' })).toBeVisible()
  await expect(page.getByText('1 page loaded on this phone.')).toBeVisible()
  expect(page.url()).not.toContain('page.png')
  expect(pageErrors).toEqual([])
})

test('a one-page pdf opens on the review screen', async ({ page }) => {
  test.setTimeout(180000)
  const pageErrors: string[] = []
  const logs: string[] = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })
  page.on('console', (message) => {
    logs.push(message.text())
  })
  await page.goto('/safeshare/')

  const filename = 'lab-page.pdf'
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose image / PDF', exact: true }).click()
  await (
    await chooser
  ).setFiles({
    name: filename,
    mimeType: 'application/pdf',
    buffer: onePagePdf(),
  })

  await expect(page.getByRole('heading', { level: 2, name: 'Review' })).toBeVisible({
    timeout: 150000,
  })
  await expect(page.getByRole('img', { name: 'Page 1' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(await page.locator('body').innerText()).not.toContain(filename)
  expect(await page.locator('body').innerText()).not.toContain('ABC')
  expect(logs.join('\n')).not.toContain('ABC')
  expect(logs.join('\n')).not.toContain(filename)
  expect(page.url()).not.toContain(filename)
  expect(pageErrors).toEqual([])
})

test('production ocr stays on this origin and does not log text', async ({ page }) => {
  test.setTimeout(120000)
  const logs: string[] = []
  const leaked: string[] = []
  const urls: string[] = []
  const assetScripts = new Set<string>()
  page.on('console', (message) => {
    logs.push(`${message.type()}: ${message.text()}`)
  })
  page.on('pageerror', (error) => {
    logs.push(error.message)
  })
  page.on('request', (request) => {
    urls.push(request.url())
    const url = new URL(request.url())
    if (url.origin !== 'http://127.0.0.1:4173') leaked.push(`${request.method()} ${request.url()}`)
    if (url.pathname.includes('/safeshare/assets/') && url.pathname.endsWith('.js')) {
      assetScripts.add(request.url())
    }
  })

  await page.goto('/safeshare/')

  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose image / PDF', exact: true }).click()
  await (
    await chooser
  ).setFiles({
    name: 'synthetic-page.png',
    mimeType: 'image/png',
    buffer: TINY_PNG,
  })

  await expect(page.getByRole('status')).toHaveText('Loading the reader.')
  await expect(page.getByRole('heading', { level: 2, name: 'Review' })).toBeVisible({
    timeout: 90000,
  })
  await expect(page.getByText(/finding identifiers/i)).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)

  const stored = await page.evaluate(async () => ({
    localKeys: Object.keys(localStorage),
    databases: indexedDB.databases
      ? (await indexedDB.databases()).map((entry) => entry.name ?? '')
      : [],
  }))
  expect(stored.localKeys).toEqual([])
  expect(stored.databases).toEqual([])

  const logText = logs.join('\n')
  expect(logText).not.toContain('synthetic-page.png')
  expect(logText.toLowerCase()).not.toContain('patient')
  expect(leaked).toEqual([])
  expect(urls.some((url) => url.includes('/safeshare/vendor/tesseract/worker.min.js'))).toBe(true)
  expect(
    urls.some((url) => url.includes('/safeshare/vendor/tesseract/lang/eng.traineddata.gz')),
  ).toBe(true)
  expect(urls.some((url) => url.includes('/safeshare/vendor/tesseract/core/'))).toBe(true)
  expect(assetScripts.size).toBeGreaterThan(0)
  for (const src of assetScripts) {
    const response = await page.request.get(src)
    expect(response.ok()).toBe(true)
    expect(await response.text()).not.toContain('safeshare-dev-ocr-boxes')
  }
  expect(page.url()).not.toContain('synthetic')
})

function crc32(data: Buffer): number {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return ~crc >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** Solid RGB PNG. Used so a drawn box can change a known canvas pixel. */
function solidPng(width: number, height: number): Buffer {
  const stride = width * 3 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y += 1) {
    const row = y * stride
    raw[row] = 0
    for (let x = 0; x < width; x += 1) {
      const index = row + 1 + x * 3
      raw[index] = 210
      raw[index + 1] = 214
      raw[index + 2] = 216
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

test('review checkbox gates share and a drawn box updates the canvas', async ({ page }) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 390, height: 844 })
  const logs: string[] = []
  page.on('console', (message) => {
    logs.push(message.text())
  })
  await page.goto('/safeshare/')

  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose image / PDF', exact: true }).click()
  await (
    await chooser
  ).setFiles({
    name: 'sheet.png',
    mimeType: 'image/png',
    buffer: solidPng(160, 200),
  })

  const share = page.getByRole('button', { name: 'Share', exact: true })
  await expect(share).toBeVisible({ timeout: 90000 })
  await expect(share).toBeDisabled()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByText(/finding identifiers/i)).toHaveCount(0)

  const confirm = page.getByRole('checkbox', {
    name: 'I have checked that no patient identifiers are visible',
  })
  const targets = [
    page.getByRole('button', { name: 'Standard', exact: true }),
    page.getByRole('button', { name: 'Header blackout', exact: true }),
    page.getByRole('button', { name: 'Results only', exact: true }),
    page.getByRole('button', { name: 'Manual', exact: true }),
    page.getByRole('button', { name: 'Peek', exact: true }),
    share,
    confirm,
  ]
  for (const target of targets) {
    const box = await target.boundingBox()
    if (!box) throw new Error('control has no box')
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
  }

  await page.getByRole('button', { name: 'Manual', exact: true }).click()
  const layer = page.locator('.redact-layer')
  await expect.poll(async () => (await layer.boundingBox())?.height ?? 0).toBeGreaterThan(80)

  const box = await layer.boundingBox()
  if (!box) throw new Error('overlay has no box')
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 12 })
  await page.mouse.up()

  const pixel = () =>
    layer.evaluate((node) => {
      const canvas = node as HTMLCanvasElement
      const context = canvas.getContext('2d')
      const sample = context?.getImageData(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height / 2),
        1,
        1,
      ).data
      return {
        r: sample?.[0] ?? -1,
        g: sample?.[1] ?? -1,
        b: sample?.[2] ?? -1,
        a: sample?.[3] ?? -1,
      }
    })

  await expect.poll(pixel).toEqual({ r: 0, g: 0, b: 0, a: 255 })
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect.poll(async () => (await pixel()).a).toBe(0)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect.poll(pixel).toEqual({ r: 0, g: 0, b: 0, a: 255 })

  await confirm.check()
  await expect(share).toBeEnabled()
  await confirm.uncheck()
  await expect(share).toBeDisabled()

  const body = await page.locator('body').innerText()
  expect(body).not.toContain('sheet.png')
  expect(logs.join('\n')).not.toContain('sheet.png')
  expect(page.url()).not.toContain('sheet')
})

function decodePng(png: Buffer): {
  width: number
  height: number
  pixel: (x: number, y: number) => { r: number; g: number; b: number; a: number }
} {
  if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error('not a png')
  }
  let offset = 8
  const idat: Buffer[] = []
  let width = 0
  let height = 0
  let depth = 0
  let color = 0
  let interlace = 0
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.subarray(offset + 4, offset + 8).toString('ascii')
    const data = png.subarray(offset + 8, offset + 8 + length)
    if (type === 'eXIf') throw new Error('exif chunk')
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      depth = data[8] ?? 0
      color = data[9] ?? 0
      interlace = data[12] ?? 0
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data))
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + length
  }
  if (depth !== 8 || interlace !== 0 || (color !== 2 && color !== 6)) {
    throw new Error(`unexpected png ${width}x${height} color ${color}`)
  }
  const channels = color === 6 ? 4 : 3
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const rows = new Uint8Array(height * stride)
  let src = 0
  for (let y = 0; y < height; y += 1) {
    const filter = raw[src] ?? 0
    src += 1
    const row = y * stride
    for (let x = 0; x < stride; x += 1) {
      const value = raw[src] ?? 0
      src += 1
      const left = x >= channels ? (rows[row + x - channels] ?? 0) : 0
      const up = y > 0 ? (rows[row - stride + x] ?? 0) : 0
      const upLeft = y > 0 && x >= channels ? (rows[row - stride + x - channels] ?? 0) : 0
      let next = value
      if (filter === 1) next = (value + left) & 255
      else if (filter === 2) next = (value + up) & 255
      else if (filter === 3) next = (value + Math.floor((left + up) / 2)) & 255
      else if (filter === 4) {
        const estimate = left + up - upLeft
        const pa = Math.abs(estimate - left)
        const pb = Math.abs(estimate - up)
        const pc = Math.abs(estimate - upLeft)
        const paeth = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft
        next = (value + paeth) & 255
      } else if (filter !== 0) {
        throw new Error(`png filter ${filter}`)
      }
      rows[row + x] = next
    }
  }
  return {
    width,
    height,
    pixel(x, y) {
      const index = (y * width + x) * channels
      return {
        r: rows[index] ?? -1,
        g: rows[index + 1] ?? -1,
        b: rows[index + 2] ?? -1,
        a: channels === 4 ? (rows[index + 3] ?? -1) : 255,
      }
    },
  }
}

test('export downloads a redacted png with black boxes and no exif when share is absent', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined })
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  const logs: string[] = []
  page.on('console', (message) => {
    logs.push(message.text())
  })
  await page.goto('/safeshare/')

  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose image / PDF', exact: true }).click()
  await (
    await chooser
  ).setFiles({
    name: 'sheet.png',
    mimeType: 'image/png',
    buffer: solidPng(120, 80),
  })

  const share = page.getByRole('button', { name: 'Share', exact: true })
  await expect(share).toBeVisible({ timeout: 90000 })
  await expect(share).toBeDisabled()
  await page.getByRole('button', { name: 'Manual', exact: true }).click()
  await page.getByRole('button', { name: 'PNG', exact: true }).click()

  const layer = page.locator('.redact-layer')
  await expect.poll(async () => (await layer.boundingBox())?.height ?? 0).toBeGreaterThan(40)
  const box = await layer.boundingBox()
  if (!box) throw new Error('overlay has no box')
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 12 })
  await page.mouse.up()

  await page
    .getByRole('checkbox', { name: 'I have checked that no patient identifiers are visible' })
    .check()
  const downloadPromise = page.waitForEvent('download')
  await share.click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^report-redacted-[a-z0-9]{6}-p1\.png$/)
  expect(download.suggestedFilename()).not.toContain('sheet')

  const dir = mkdtempSync(join(tmpdir(), 'safeshare-export-'))
  const saved = join(dir, 'out.png')
  await download.saveAs(saved)
  const bytes = readFileSync(saved)
  expect(bytes.subarray(0, 4).toString('ascii')).not.toBe('%PDF')
  expect(bytes.includes(Buffer.from('Exif'))).toBe(false)
  expect(bytes.includes(Buffer.from('eXIf'))).toBe(false)
  expect(bytes.includes(Buffer.from([0xff, 0xe1]))).toBe(false)

  const image = decodePng(bytes)
  expect(image.width).toBe(120)
  expect(image.height).toBeGreaterThan(80)
  expect(image.pixel(60, 40)).toEqual({ r: 0, g: 0, b: 0, a: 255 })
  expect(image.pixel(1, 1)).toEqual({ r: 210, g: 214, b: 216, a: 255 })

  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('img', { name: 'Page 1' })).toHaveCount(0)
  expect(logs.join('\n')).not.toContain('sheet.png')
  expect(page.url()).not.toContain('sheet')
})

const PRECACHE_PARTS = [
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'eng.traineddata.gz',
  'tesseract/worker.min.js',
  'tesseract/core/tesseract-core-simd-lstm.wasm.js',
  'pdf.worker.min.mjs',
  'zxing_reader.wasm',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.wasm',
  'blaze_face_short_range.tflite',
]

async function precachePaths(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const paths: string[] = []
    for (const name of await caches.keys()) {
      const cache = await caches.open(name)
      for (const request of await cache.keys()) paths.push(new URL(request.url).pathname)
    }
    return paths
  })
}

test('full flow records only same-origin loads, then works offline with a black export', async ({
  page,
  context,
}) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined })
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
  })
  const hits: { method: string; url: string; fromSw: boolean }[] = []
  context.on('response', (response) => {
    hits.push({
      method: response.request().method(),
      url: response.url(),
      fromSw: response.fromServiceWorker(),
    })
  })
  context.on('requestfailed', (request) => {
    hits.push({ method: request.method(), url: request.url(), fromSw: false })
  })

  await page.goto('/safeshare/')
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await expect
    .poll(async () => {
      const paths = await precachePaths(page)
      return PRECACHE_PARTS.every((part) => paths.some((path) => path.includes(part)))
    })
    .toBe(true)

  let stable = hits.length
  let quiet = false
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.waitForTimeout(400)
    if (hits.length === stable) {
      quiet = true
      break
    }
    stable = hits.length
  }
  expect(quiet).toBe(true)
  const loaded = hits.length
  for (const hit of hits) {
    const url = new URL(hit.url)
    expect(hit.method, hit.url).toBe('GET')
    expect(url.origin, hit.url).toBe('http://127.0.0.1:4173')
  }

  const manifest = await page.evaluate(async () => {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name)
      for (const request of await cache.keys()) {
        if (!request.url.includes('manifest.webmanifest')) continue
        const response = await cache.match(request)
        return response
          ? ((await response.json()) as {
              display?: string
              share_target?: {
                method?: string
                enctype?: string
                params?: { files?: { accept?: string[] }[] }
              }
            })
          : null
      }
    }
    return null
  })
  expect(manifest?.display).toBe('standalone')
  expect(manifest?.share_target?.method).toBe('POST')
  expect(manifest?.share_target?.enctype).toBe('multipart/form-data')
  expect(manifest?.share_target?.params?.files?.[0]?.accept).toEqual(['image/*', 'application/pdf'])

  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'SafeShare MD' })).toBeVisible()

  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose image / PDF', exact: true }).click()
  await (
    await chooser
  ).setFiles({
    name: 'sheet.png',
    mimeType: 'image/png',
    buffer: solidPng(120, 80),
  })

  const share = page.getByRole('button', { name: 'Share', exact: true })
  await expect(share).toBeVisible({ timeout: 90000 })
  await page.getByRole('button', { name: 'Manual', exact: true }).click()
  await page.getByRole('button', { name: 'PNG', exact: true }).click()
  const layer = page.locator('.redact-layer')
  await expect.poll(async () => (await layer.boundingBox())?.height ?? 0).toBeGreaterThan(40)
  const box = await layer.boundingBox()
  if (!box) throw new Error('overlay has no box')
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 12 })
  await page.mouse.up()
  await page
    .getByRole('checkbox', { name: 'I have checked that no patient identifiers are visible' })
    .check()
  const downloadPromise = page.waitForEvent('download')
  await share.click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^report-redacted-[a-z0-9]{6}-p1\.png$/)
  const dir = mkdtempSync(join(tmpdir(), 'safeshare-offline-'))
  const saved = join(dir, 'out.png')
  await download.saveAs(saved)
  const bytes = readFileSync(saved)
  expect(bytes.includes(Buffer.from('Exif'))).toBe(false)
  expect(bytes.includes(Buffer.from('eXIf'))).toBe(false)
  const image = decodePng(bytes)
  expect(image.pixel(60, 40)).toEqual({ r: 0, g: 0, b: 0, a: 255 })
  expect(image.pixel(1, 1)).toEqual({ r: 210, g: 214, b: 216, a: 255 })

  const later = hits.slice(loaded)
  const network = later.filter((hit) => !hit.fromSw)
  expect(network, JSON.stringify(network)).toEqual([])
  expect(hits.filter((hit) => hit.method !== 'GET')).toEqual([])
  expect(await page.locator('body').innerText()).not.toContain('sheet.png')
})

test('a share-target POST stays inside the service worker', async ({ page, context }) => {
  test.setTimeout(120000)
  const posts: { url: string; fromSw: boolean }[] = []
  context.on('response', (response) => {
    if (response.request().method() !== 'POST') return
    posts.push({ url: response.url(), fromSw: response.fromServiceWorker() })
  })
  context.on('requestfailed', (request) => {
    if (request.method() !== 'POST') return
    posts.push({ url: request.url(), fromSw: false })
  })
  await page.goto('/safeshare/')
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  const status = await page.evaluate(async (png) => {
    const bytes = Uint8Array.from(atob(png), (char) => char.charCodeAt(0))
    const body = new FormData()
    body.append('file', new File([bytes], 'from-share.png', { type: 'image/png' }))
    const response = await fetch('/safeshare/share-target', {
      method: 'POST',
      body,
      redirect: 'manual',
    })
    return response.status
  }, TINY_PNG.toString('base64'))
  expect(status === 303 || status === 0).toBe(true)
  await expect(page.getByRole('heading', { level: 2, name: 'Review' })).toBeVisible({
    timeout: 90000,
  })
  expect(posts).toEqual([{ url: 'http://127.0.0.1:4173/safeshare/share-target', fromSw: true }])
  const cached = await precachePaths(page)
  expect(cached.some((path) => path.includes('from-share'))).toBe(false)
  expect(cached.some((path) => path.includes('share-target'))).toBe(false)
  expect(await page.locator('body').innerText()).not.toContain('from-share')
})
