/** Stored (uncompressed) zip. Local only — no library and no network. */

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function nameBytes(name: string): Uint8Array {
  if (name.length === 0 || name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw new Error('export-name')
  }
  const bytes = new Uint8Array(name.length)
  for (let index = 0; index < name.length; index += 1) {
    const code = name.charCodeAt(index)
    if (code > 0x7f) throw new Error('export-name')
    bytes[index] = code
  }
  return bytes
}

function localHeader(name: Uint8Array, data: Uint8Array, crc: number): Uint8Array {
  const out = new Uint8Array(30 + name.length + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, 0x04034b50, true)
  view.setUint16(4, 20, true)
  view.setUint16(8, 0, true)
  view.setUint32(14, crc, true)
  view.setUint32(18, data.length, true)
  view.setUint32(22, data.length, true)
  view.setUint16(26, name.length, true)
  out.set(name, 30)
  out.set(data, 30 + name.length)
  return out
}

function centralHeader(
  name: Uint8Array,
  data: Uint8Array,
  crc: number,
  offset: number,
): Uint8Array {
  const out = new Uint8Array(46 + name.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, 0x02014b50, true)
  view.setUint16(4, 20, true)
  view.setUint16(6, 20, true)
  view.setUint32(16, crc, true)
  view.setUint32(20, data.length, true)
  view.setUint32(24, data.length, true)
  view.setUint16(28, name.length, true)
  view.setUint32(42, offset, true)
  out.set(name, 46)
  return out
}

function endOfCentral(count: number, size: number, offset: number): Uint8Array {
  const out = new Uint8Array(22)
  const view = new DataView(out.buffer)
  view.setUint32(0, 0x06054b50, true)
  view.setUint16(8, count, true)
  view.setUint16(10, count, true)
  view.setUint32(12, size, true)
  view.setUint32(16, offset, true)
  return out
}

export function zipStored(files: readonly { name: string; bytes: Uint8Array }[]): Uint8Array {
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const name = nameBytes(file.name)
    const crc = crc32(file.bytes)
    const local = localHeader(name, file.bytes, crc)
    locals.push(local)
    centrals.push(centralHeader(name, file.bytes, crc, offset))
    offset += local.length
  }
  const central = concat(centrals)
  return concat([...locals, central, endOfCentral(files.length, central.length, offset)])
}
