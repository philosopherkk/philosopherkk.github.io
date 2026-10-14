import { expect, test } from 'vitest'
import {
  exportExtension,
  exportFileName,
  exportMime,
  exportToken,
  exportZipName,
  JPEG_QUALITY,
  WATERMARK_TEXT,
} from './names.ts'

test('names are random page labels and never a document name', () => {
  expect(exportToken(() => 0)).toBe('aaaaaa')
  expect(exportFileName(1, 'a1b2c3', 'jpeg')).toBe('report-redacted-a1b2c3-p1.jpg')
  expect(exportFileName(2, 'a1b2c3', 'png')).toBe('report-redacted-a1b2c3-p2.png')
  expect(exportZipName('a1b2c3')).toBe('report-redacted-a1b2c3.zip')
  const patient = 'Chan Tai Man lab.pdf'
  expect(
    exportFileName(
      1,
      exportToken(() => 0.5),
      'jpeg',
    ),
  ).not.toContain(patient)
  expect(exportFileName(1, 'a1b2c3', 'jpeg')).not.toContain('Chan')
})

test('jpeg is the default quality and pdf is not an output type', () => {
  expect(JPEG_QUALITY).toBe(0.9)
  expect(exportMime('jpeg')).toBe('image/jpeg')
  expect(exportMime('png')).toBe('image/png')
  expect(exportExtension('jpeg')).toBe('jpg')
  expect(exportExtension('png')).toBe('png')
  expect(WATERMARK_TEXT).toBe('De-identified · For clinical discussion only')
})
