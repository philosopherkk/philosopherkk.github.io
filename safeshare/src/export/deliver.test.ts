import { expect, test } from 'vitest'
import { canShareFiles, deliverFiles } from './deliver.ts'

function file(name: string): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' })
}

const page = file('report-redacted-abc123-p1.png')
const second = file('report-redacted-abc123-p2.png')

test('one share call sends every page when canShare accepts the files', async () => {
  let shared: File[] = []
  const result = await deliverFiles(
    [page, second],
    'abc123',
    {
      canShare: (data) => data.files.length === 2,
      share: async (data) => {
        shared = data.files
      },
    },
    () => {
      throw new Error('download')
    },
  )
  expect(result).toEqual({ outcome: 'shared', urls: [] })
  expect(shared.map((item) => item.name)).toEqual([page.name, second.name])
})

test('a dismissed share sheet does not download', async () => {
  const result = await deliverFiles(
    [page],
    'abc123',
    {
      canShare: () => true,
      share: async () => {
        throw Object.assign(new Error('cancel'), { name: 'AbortError' })
      },
    },
    () => {
      throw new Error('download')
    },
  )
  expect(result).toEqual({ outcome: 'dismissed', urls: [] })
})

test('absent canShare downloads one file, or a zip when there are several', async () => {
  const saved: string[] = []
  const single = await deliverFiles([page], 'abc123', {}, (blob, filename) => {
    saved.push(`${filename}:${blob.type}`)
    return 'blob:one'
  })
  expect(single).toEqual({ outcome: 'downloaded', urls: ['blob:one'] })
  expect(saved).toEqual(['report-redacted-abc123-p1.png:image/png'])

  saved.length = 0
  const many = await deliverFiles(
    [page, second],
    'abc123',
    { canShare: undefined },
    (blob, filename) => {
      saved.push(`${filename}:${blob.type}:${blob.size}`)
      return 'blob:zip'
    },
  )
  expect(many.outcome).toBe('downloaded')
  expect(saved[0]?.startsWith('report-redacted-abc123.zip:application/zip:')).toBe(true)
  expect(canShareFiles({}, [page])).toBe(false)
})
