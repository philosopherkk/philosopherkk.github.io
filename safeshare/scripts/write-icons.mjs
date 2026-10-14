import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')

const table = new Uint32Array(256)
for (let n = 0; n < 256; n += 1) {
  let c = n
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  table[n] = c >>> 0
}

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) {
    c = table[(c ^ byte) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([length, typeBuf, data, crc])
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const bg = [15, 76, 87]
  const paper = [247, 251, 251]
  const bar = [18, 18, 18]
  const left = Math.round(size * 0.28)
  const right = Math.round(size * 0.72)
  const top = Math.round(size * 0.18)
  const bottom = Math.round(size * 0.82)
  const barLeft = Math.round(size * 0.34)
  const barRight = Math.round(size * 0.66)
  const barTop = Math.round(size * 0.42)
  const barBottom = Math.round(size * 0.52)

  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x += 1) {
      const offset = row + 1 + x * 4
      let red = bg[0]
      let green = bg[1]
      let blue = bg[2]
      if (x >= left && x < right && y >= top && y < bottom) {
        red = paper[0]
        green = paper[1]
        blue = paper[2]
      }
      if (x >= barLeft && x < barRight && y >= barTop && y < barBottom) {
        red = bar[0]
        green = bar[1]
        blue = bar[2]
      }
      raw[offset] = red
      raw[offset + 1] = green
      raw[offset + 2] = blue
      raw[offset + 3] = 255
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'icon-192.png'), png(192))
writeFileSync(join(outDir, 'icon-512.png'), png(512))
console.log(`wrote icons in ${outDir}`)
