/**
 * Copy self-hosted OCR and PDF worker files into public/vendor.
 *
 * Worker, core, and pdf.js come from node_modules.
 * eng traineddata must be tessdata_fast (uncompressed 4113088 bytes).
 * @tesseract.js-data/eng@1.0.0 does not publish that file: its 4.0.0 gzip is
 * standard tessdata (23466654 bytes) and 4.0.0_best_int is the best integer model.
 * The fast gzip is committed at traineddata/eng.tessdata_fast.traineddata.gz
 * (naptha/tessdata 4.0.0_fast). If a future npm package ships a *fast* path, use that.
 */
import { createRequire } from 'node:module'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const vendorRoot = join(root, 'public', 'vendor')

const FAST_RAW_BYTES = 4113088
const CORE_FILES = [
  'tesseract-core.wasm.js',
  'tesseract-core-simd.wasm.js',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
]

function packageDir(name) {
  return dirname(require.resolve(`${name}/package.json`))
}

function readPackage(dir) {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
}

function findFastInPackage(dir) {
  const found = []
  const stack = [dir]
  while (stack.length > 0) {
    const current = stack.pop()
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
      } else if (entry.name === 'eng.traineddata.gz' && full.includes('fast')) {
        found.push(full)
      }
    }
  }
  return found
}

const tessDir = packageDir('tesseract.js')
const coreDir = packageDir('tesseract.js-core')
const pdfDir = packageDir('pdfjs-dist')
const engDir = packageDir('@tesseract.js-data/eng')

rmSync(vendorRoot, { recursive: true, force: true })
mkdirSync(join(vendorRoot, 'tesseract', 'core'), { recursive: true })
mkdirSync(join(vendorRoot, 'tesseract', 'lang'), { recursive: true })
mkdirSync(join(vendorRoot, 'pdfjs'), { recursive: true })

const workerSrc = join(tessDir, 'dist', 'worker.min.js')
if (!existsSync(workerSrc)) {
  throw new Error('tesseract.js worker.min.js is missing')
}
cpSync(workerSrc, join(vendorRoot, 'tesseract', 'worker.min.js'))

for (const name of CORE_FILES) {
  const src = join(coreDir, name)
  if (!existsSync(src)) {
    throw new Error(`tesseract.js-core is missing ${name}`)
  }
  cpSync(src, join(vendorRoot, 'tesseract', 'core', name))
}

const bundledFast = join(root, 'traineddata', 'eng.tessdata_fast.traineddata.gz')
const fastFromPackage = findFastInPackage(engDir)
const engSrc = fastFromPackage[0] ?? bundledFast
if (!existsSync(engSrc)) {
  throw new Error('tessdata_fast eng.traineddata.gz was not found')
}
const engRaw = gunzipSync(readFileSync(engSrc))
if (engRaw.length !== FAST_RAW_BYTES) {
  throw new Error(
    `Refusing eng traineddata (${engRaw.length} bytes). Expected tessdata_fast (${FAST_RAW_BYTES}).`,
  )
}
cpSync(engSrc, join(vendorRoot, 'tesseract', 'lang', 'eng.traineddata.gz'))

const pdfWorker = join(pdfDir, 'build', 'pdf.worker.min.mjs')
if (!existsSync(pdfWorker)) {
  throw new Error('pdfjs-dist build/pdf.worker.min.mjs is missing')
}
cpSync(pdfWorker, join(vendorRoot, 'pdfjs', 'pdf.worker.min.mjs'))

const tessPkg = readPackage(tessDir)
const corePkg = readPackage(coreDir)
const pdfPkg = readPackage(pdfDir)
const engPkg = readPackage(engDir)
const engLabel = engSrc.startsWith(engDir)
  ? `@tesseract.js-data/eng@${engPkg.version} (fast path)`
  : 'traineddata/eng.tessdata_fast.traineddata.gz (npm package has no 4.0.0_fast)'

const sources = [
  `tesseract.js@${tessPkg.version} dist/worker.min.js`,
  `tesseract.js-core@${corePkg.version} ${CORE_FILES.join(', ')}`,
  `eng tessdata_fast uncompressed ${FAST_RAW_BYTES} bytes`,
  `eng source: ${engLabel}`,
  `pdfjs-dist@${pdfPkg.version} build/pdf.worker.min.mjs`,
  'Languages copied: eng only.',
  '',
].join('\n')
writeFileSync(join(vendorRoot, 'SOURCES.txt'), sources)

console.log(`copied vendor files to ${vendorRoot}`)
