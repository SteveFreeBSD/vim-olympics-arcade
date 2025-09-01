import { describe, test, expect } from 'vitest'
import sanitizeLesson from '../utils/lessonValidation.js'

describe('lessonValidation', () => {
  test('sanitizes valid lesson', () => {
    const raw = {
      keys: 'dw',
      desc: 'Delete word',
      tutorial: {
        buffer: ['alpha |beta', 'gamma'],
        steps: [{ do: 'Type dw', expect: 'deletes word' }],
        keys: ['d', 'w']
      }
    }
    const safe = sanitizeLesson(raw)
    expect(safe.tutorial.buffer.length).toBe(2)
    expect(Array.isArray(safe.tutorial.keys)).toBe(true)
  })

  test('rejects missing tutorial', () => {
    expect(() => sanitizeLesson({})).toThrow()
  })

  test('caps buffer length and strips control chars', () => {
    const raw = { tutorial: { buffer: Array.from({ length: 300 }, (_, i) => `line${i}\x07`) } }
    const safe = sanitizeLesson(raw)
    expect(safe.tutorial.buffer.length).toBeLessThanOrEqual(200)
    expect(safe.tutorial.buffer[0]).toBe('line0')
  })
})

