import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { describe, expect, test } from 'vitest'
import {
  AIRPLANE_MODE_CHECK,
  CORE_PROMISE,
  DISCLAIMER_ADVICE,
  DISCLAIMER_CHECK,
  DISCLAIMER_DETECTION,
  ONBOARDING_STEPS,
  PRIVACY_ON_DEVICE,
  PRIVACY_VERIFY,
} from './copy.ts'
import { CONTENT_SECURITY_POLICY, PERMISSIONS_POLICY, REFERRER_POLICY } from './securityHeaders.ts'
import {
  DEFAULT_SETTINGS,
  detectionSettingsChanged,
  sanitizeSettings,
  saveSettings,
  SETTINGS_STORAGE_KEY,
} from './settings.ts'
import { vendorPaths } from './vendorPaths.ts'

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const SPEC_CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
const FAST_RAW_BYTES = 4113088
const FACE_SHA256 = 'b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f'

function walk(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else files.push(full)
  }
  return files
}

test('core promise and airplane-mode check are stated', () => {
  expect(CORE_PROMISE).toBe(
    'Nothing leaves your phone except the redacted image you choose to share.',
  )
  expect(AIRPLANE_MODE_CHECK.toLowerCase()).toContain('airplane mode')
  expect(PRIVACY_ON_DEVICE).toContain('Nothing is uploaded')
  expect(PRIVACY_ON_DEVICE.toLowerCase()).toContain('on this phone')
  expect(PRIVACY_VERIFY.toLowerCase()).toContain('turn the network off')
  expect(PRIVACY_VERIFY.toLowerCase()).toContain('run a report')
  expect(ONBOARDING_STEPS.map((step) => step.title)).toEqual([
    'On this phone',
    'Nothing is uploaded',
    'Before you start',
  ])
  expect(ONBOARDING_STEPS[2]?.body).toContain(DISCLAIMER_DETECTION)
  expect(ONBOARDING_STEPS[2]?.body).toContain(DISCLAIMER_CHECK)
  expect(ONBOARDING_STEPS[2]?.body).toContain(DISCLAIMER_ADVICE)
})

test('CSP and privacy headers match SPEC §9', () => {
  expect(CONTENT_SECURITY_POLICY).toBe(SPEC_CSP)
  expect(REFERRER_POLICY).toBe('no-referrer')
  expect(PERMISSIONS_POLICY).toBe('camera=(self)')

  const html = readFileSync(join(appRoot, 'index.html'), 'utf8')
  const headers = readFileSync(join(appRoot, 'public', '_headers'), 'utf8')
  expect(html).toContain(SPEC_CSP)
  expect(html).toContain('content="no-referrer"')
  expect(html).toContain('content="camera=(self)"')
  expect(headers).toContain(`Content-Security-Policy: ${SPEC_CSP}`)
  expect(headers).toContain('Referrer-Policy: no-referrer')
  expect(headers).toContain('Permissions-Policy: camera=(self)')
})

test('vendor paths stay on our origin', () => {
  for (const path of Object.values(vendorPaths)) {
    expect(path.startsWith('/safeshare/vendor/')).toBe(true)
    expect(path.includes('://')).toBe(false)
  }
})

test('settings storage keeps settings only', () => {
  const cleaned = sanitizeSettings({
    defaultMode: 'standard',
    redactDoctorNames: true,
    image: 'not-a-setting',
    ocrText: 'patient name',
  })
  expect(cleaned).not.toHaveProperty('image')
  expect(cleaned).not.toHaveProperty('ocrText')
  expect(cleaned.disclaimerAccepted).toBe(false)
  expect(JSON.stringify(cleaned)).not.toContain('patient')

  const accepted = sanitizeSettings({
    disclaimerAccepted: true,
    image: 'not-a-setting',
    ocrText: 'patient name',
  })
  expect(accepted.disclaimerAccepted).toBe(true)
  expect(accepted).not.toHaveProperty('image')
  expect(accepted).not.toHaveProperty('ocrText')
  expect(JSON.stringify(accepted)).not.toContain('patient')
  expect(detectionSettingsChanged(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, redactAge: true })).toBe(
    true,
  )
  expect(
    detectionSettingsChanged(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, watermark: false }),
  ).toBe(false)

  const saved: Record<string, string> = {}
  saveSettings(cleaned, {
    setItem(key, value) {
      saved[key] = value
    },
  })
  expect(Object.keys(saved)).toEqual([SETTINGS_STORAGE_KEY])
  expect(saved[SETTINGS_STORAGE_KEY]).not.toContain('patient')
})

test('app source does not call the network or load a CDN', () => {
  const files = walk(join(appRoot, 'src')).filter(
    (file) => /\.(ts|tsx|css)$/.test(file) && !file.endsWith('.test.ts'),
  )
  files.push(join(appRoot, 'index.html'))
  const banned =
    /jsdelivr|unpkg|googleapis|googletagmanager|sentry\.io|cdn\.js|tessdata\.projectnaptha/i
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    expect(text, relative(appRoot, file)).not.toMatch(banned)
    expect(text, relative(appRoot, file)).not.toMatch(/\bfetch\s*\(/)
    expect(text, relative(appRoot, file)).not.toMatch(/XMLHttpRequest|sendBeacon|new WebSocket/)
    if (!file.endsWith('settings.ts')) {
      expect(text, relative(appRoot, file)).not.toMatch(/localStorage/)
    }
  }
})

describe('vendor copy', () => {
  test('copies tesseract fast eng data and the pdf.js worker from disk', () => {
    const result = spawnSync(process.execPath, ['scripts/copy-vendor.mjs'], {
      cwd: appRoot,
      encoding: 'utf8',
    })
    expect(result.status, result.stderr).toBe(0)

    const vendor = join(appRoot, 'public', 'vendor')
    const files = walk(vendor)
    const names = files.map((file) => relative(vendor, file))
    expect(names).toContain('tesseract/worker.min.js')
    expect(names).toContain('tesseract/core/tesseract-core-simd-lstm.wasm.js')
    expect(names).toContain('tesseract/core/tesseract-core.wasm.js')
    expect(names).toContain('tesseract/lang/eng.traineddata.gz')
    expect(names).toContain('pdfjs/pdf.worker.min.mjs')
    expect(names).toContain('zxing/zxing_reader.wasm')
    expect(names).toContain('mediapipe/vision_wasm_internal.js')
    expect(names).toContain('mediapipe/vision_wasm_internal.wasm')
    expect(names).toContain('mediapipe/vision_wasm_nosimd_internal.js')
    expect(names).toContain('mediapipe/vision_wasm_nosimd_internal.wasm')
    expect(names).toContain('mediapipe/blaze_face_short_range.tflite')

    const eng = gunzipSync(readFileSync(join(vendor, 'tesseract', 'lang', 'eng.traineddata.gz')))
    expect(eng.length).toBe(FAST_RAW_BYTES)

    for (const name of names) {
      expect(name.toLowerCase()).not.toMatch(/msa|chi_tra|chi_sim|best_int|mykad/)
    }
    expect(statSync(join(vendor, 'pdfjs', 'pdf.worker.min.mjs')).size).toBeGreaterThan(10000)
    expect(statSync(join(vendor, 'zxing', 'zxing_reader.wasm')).size).toBeGreaterThan(100000)
    const face = readFileSync(join(vendor, 'mediapipe', 'blaze_face_short_range.tflite'))
    expect(createHash('sha256').update(face).digest('hex')).toBe(FACE_SHA256)
  })
})
