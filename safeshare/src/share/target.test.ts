import { expect, test } from 'vitest'
import { firstSharedFile, isSharePost, SHARE_FIELD, SHARE_PATH } from './target.ts'

test('only the share-target POST is claimed by the worker', () => {
  expect(isSharePost(`http://127.0.0.1${SHARE_PATH}`, 'POST')).toBe(true)
  expect(isSharePost(`http://127.0.0.1${SHARE_PATH}?x=1`, 'GET')).toBe(false)
  expect(isSharePost('http://127.0.0.1/safeshare/', 'POST')).toBe(false)
  expect(isSharePost('not a url', 'POST')).toBe(false)
})

test('the share payload keeps the first image or PDF and drops the rest', async () => {
  const form = new FormData()
  form.append(SHARE_FIELD, new File(['notes'], 'notes.txt', { type: 'text/plain' }))
  form.append(
    SHARE_FIELD,
    new File([Uint8Array.from([1, 2, 3])], 'page.png', { type: 'image/png' }),
  )
  form.append(SHARE_FIELD, new File(['%PDF'], 'other.pdf', { type: 'application/pdf' }))
  const file = await firstSharedFile(form)
  expect(file?.name).toBe('page.png')
  expect(file?.type).toBe('image/png')
  expect(new Uint8Array(file?.buffer ?? new ArrayBuffer(0))).toEqual(Uint8Array.from([1, 2, 3]))
  expect(await firstSharedFile(new FormData())).toBeNull()
})
