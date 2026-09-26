import { describe, expect, test } from 'vitest'
import { extensionOf, fileKind, loadErrorMessage } from './classify.ts'

describe('file kind', () => {
  test('accepts images and pdfs, including an empty mime with an extension', () => {
    expect(fileKind({ mimeType: 'image/jpeg', extension: 'jpg' })).toBe('image')
    expect(fileKind({ mimeType: 'image/heic', extension: 'heic' })).toBe('image')
    expect(fileKind({ mimeType: 'application/pdf', extension: 'pdf' })).toBe('pdf')
    expect(fileKind({ mimeType: '', extension: 'png' })).toBe('image')
    expect(fileKind({ mimeType: 'application/octet-stream', extension: 'pdf' })).toBe('pdf')
  })

  test('rejects other types, including svg', () => {
    expect(fileKind({ mimeType: 'text/plain', extension: 'txt' })).toBe('unsupported')
    expect(fileKind({ mimeType: 'image/svg+xml', extension: 'svg' })).toBe('unsupported')
    expect(fileKind({ mimeType: '', extension: '' })).toBe('unsupported')
  })

  test('reads only the extension', () => {
    expect(extensionOf('scan.PDF')).toBe('pdf')
    expect(extensionOf('folder/page.JPEG')).toBe('jpeg')
    expect(extensionOf('no-extension')).toBe('')
  })
})

describe('load errors', () => {
  test('messages do not include a file name or document text', () => {
    const sampleName = 'patient-chan-report.heic'
    const codes = ['unsupported', 'image-decode', 'pdf-decode', 'too-many-pages'] as const
    for (const code of codes) {
      const message = loadErrorMessage(code)
      expect(message).not.toContain(sampleName)
      expect(message.toLowerCase()).not.toContain('patient')
      expect(message).not.toContain('chan')
      expect(message).not.toMatch(/\.(heic|pdf|jpe?g|png)/i)
    }
    expect(loadErrorMessage('image-decode')).toBe(
      'The photo could not be read. Choose a JPEG or PNG.',
    )
    expect(loadErrorMessage('too-many-pages')).toContain('more than 10 pages')
    expect(loadErrorMessage('unsupported')).toContain('not supported')
  })
})
