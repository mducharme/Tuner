import { describe, expect, it } from 'vitest'
import { INSTRUMENTS, findInstrument, findTuning } from '../src/tunings.js'

describe('tunings registry', () => {
  it('lists at least guitar', () => {
    expect(INSTRUMENTS.some((i) => i.id === 'guitar')).toBe(true)
  })

  it('findInstrument returns null for unknown id', () => {
    expect(findInstrument('nope')).toBeNull()
  })

  it('findInstrument resolves guitar', () => {
    const g = findInstrument('guitar')
    expect(g?.name).toBe('Guitar')
    expect(g?.tunings.some((t) => t.id === 'guitar-standard')).toBe(true)
  })

  it('findTuning returns null when instrument missing', () => {
    expect(findTuning('unknown', 'guitar-standard')).toBeNull()
  })

  it('findTuning returns null when tuning missing', () => {
    expect(findTuning('guitar', 'unknown')).toBeNull()
  })

  it('findTuning returns tuning for valid pair', () => {
    const t = findTuning('guitar', 'guitar-standard')
    expect(t?.name).toContain('Standard')
    expect(t?.strings).toHaveLength(6)
  })
})
