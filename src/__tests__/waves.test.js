import { describe, test, expect } from 'vitest'
import { thresholdForWave, isBossWave, nextWave } from '../game/waves'

describe('waves', () => {
  test('thresholds for waves 1-4', () => {
    expect(thresholdForWave(1)).toBe(3)
    expect(thresholdForWave(2)).toBe(4)
    expect(thresholdForWave(3)).toBe(5)
    expect(thresholdForWave(4)).toBe(6)
  })

  test('boss only on wave 5', () => {
    expect(isBossWave(4)).toBe(false)
    expect(isBossWave(5)).toBe(true)
    expect(isBossWave(8)).toBe(false)
  })

  test('nextWave progresses only when threshold met in waves 1-4', () => {
    expect(nextWave(1, 2)).toBe(1)
    expect(nextWave(1, 3)).toBe(2)
    expect(nextWave(2, 4)).toBe(3)
    expect(nextWave(3, 5)).toBe(4)
    expect(nextWave(4, 5)).toBe(4)
    expect(nextWave(4, 6)).toBe(5)
  })
})
