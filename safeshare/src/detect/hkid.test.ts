import { expect, test } from 'vitest'
import { hkidCheckDigit, hkidConfidence } from './hkid.ts'

test('check digit matches the published remainder and only raises confidence', () => {
  expect(hkidCheckDigit('A123456')).toBe('3')
  expect(hkidCheckDigit('A880101')).toBe('3')
  expect(hkidConfidence('A123456', '3')).toBeGreaterThan(hkidConfidence('A123456', '9'))
  expect(hkidConfidence('A123456', '9')).toBeGreaterThan(0)
})
