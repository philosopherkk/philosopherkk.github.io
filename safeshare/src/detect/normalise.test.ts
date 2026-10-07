import { expect, test } from 'vitest'
import { isMostlyDigits, normaliseToken } from './normalise.ts'

test('maps digit-like letters only when the token is mostly digits', () => {
  expect(normaliseToken('A88O1O1(3)')).toBe('A880101(3)')
  expect(normaliseToken('l23')).toBe('123')
  expect(normaliseToken('S55')).toBe('555')
  expect(normaliseToken('BLOOD')).toBe('BLOOD')
  expect(normaliseToken('Test')).toBe('Test')
  expect(normaliseToken('O2')).toBe('O2')
  expect(isMostlyDigits('A88O1O1(3)')).toBe(true)
  expect(isMostlyDigits('BLOOD')).toBe(false)
})
