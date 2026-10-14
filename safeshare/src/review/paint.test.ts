import { expect, test } from 'vitest'
import { paintRedactions, type RedactionContext } from './paint.ts'

test('enabled boxes are filled opaque black and removed boxes are not filled', () => {
  const calls: string[] = []
  const context: RedactionContext = {
    fillStyle: '',
    globalAlpha: 0,
    fillRect(x, y, width, height) {
      calls.push(`${this.fillStyle} ${this.globalAlpha} ${x} ${y} ${width} ${height}`)
    },
  }
  paintRedactions(context, [
    { enabled: true, bbox: { x: 1, y: 2, width: 3, height: 4 } },
    { enabled: false, bbox: { x: 8, y: 8, width: 5, height: 5 } },
  ])
  expect(context.globalAlpha).toBe(1)
  expect(context.fillStyle).toBe('#000000')
  expect(calls).toEqual(['#000000 1 1 2 3 4'])
})
