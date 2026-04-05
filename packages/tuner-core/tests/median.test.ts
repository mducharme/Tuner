import { describe, expect, it } from 'vitest'
import { median } from '../src/utils/median.js'

describe('median', () => {
  it('returns the middle element for odd length', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([10])).toBe(10)
  })

  it('returns average of two middles for even length', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })

  it('throws on empty', () => {
    expect(() => median([])).toThrow()
  })
})
