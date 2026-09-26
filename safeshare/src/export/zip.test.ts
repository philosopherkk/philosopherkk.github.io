import { expect, test } from 'vitest'
import { zipStored } from './zip.ts'

function readStored(zip: Uint8Array): { name: string; bytes: Uint8Array }[] {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  const files: { name: string; bytes: Uint8Array }[] = []
  let offset = 0
  while (offset + 4 <= zip.length && view.getUint32(offset, true) === 0x04034b50) {
    const nameLength = view.getUint16(offset + 26, true)
    const size = view.getUint32(offset + 22, true)
    const name = new TextDecoder().decode(zip.subarray(offset + 30, offset + 30 + nameLength))
    const start = offset + 30 + nameLength
    files.push({ name, bytes: zip.slice(start, start + size) })
    offset = start + size
  }
  expect(view.getUint32(offset, true)).toBe(0x02014b50)
  return files
}

test('a stored zip round-trips the export names and bytes', () => {
  const first = new Uint8Array([1, 2, 3, 4])
  const second = new Uint8Array([9])
  const zip = zipStored([
    { name: 'report-redacted-abc123-p1.png', bytes: first },
    { name: 'report-redacted-abc123-p2.png', bytes: second },
  ])
  expect(readStored(zip)).toEqual([
    { name: 'report-redacted-abc123-p1.png', bytes: first },
    { name: 'report-redacted-abc123-p2.png', bytes: second },
  ])
})
