import { describe, expect, it } from 'vitest'
import {
  frequencyToMidi,
  getCents,
  getCentsFromTarget,
  midiToFrequency,
  midiToNote,
  midiToOctave,
} from '../src/notes.js'

describe('frequencyToMidi', () => {
  it('maps A4 = 440 Hz to MIDI 69', () => {
    expect(frequencyToMidi(440)).toBeCloseTo(69, 5)
  })

  it('maps E2 ≈ 82.41 Hz to MIDI 40', () => {
    expect(frequencyToMidi(82.41)).toBeCloseTo(40, 1)
  })
})

describe('midiToFrequency', () => {
  it('maps MIDI 69 to 440 Hz', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 5)
  })

  it('maps MIDI 40 to E2 (~82.41 Hz)', () => {
    expect(midiToFrequency(40)).toBeCloseTo(82.40689, 2)
  })
})

describe('midiToNote', () => {
  it('returns A for MIDI 69 (A4)', () => {
    expect(midiToNote(69)).toBe('A')
  })

  it('returns E for MIDI 40 (E2)', () => {
    expect(midiToNote(40)).toBe('E')
  })

  it('uses nearest semitone for fractional MIDI', () => {
    expect(midiToNote(69.4)).toBe('A')
    expect(midiToNote(69.6)).toBe('A#')
  })
})

describe('midiToOctave', () => {
  it('returns 4 for A4 (MIDI 69)', () => {
    expect(midiToOctave(69)).toBe(4)
  })

  it('returns 2 for E2 (MIDI 40)', () => {
    expect(midiToOctave(40)).toBe(2)
  })
})

describe('getCents', () => {
  it('is 0 at exact semitone (440 Hz)', () => {
    expect(getCents(440)).toBe(0)
  })

  it('is positive when sharp of nearest semitone', () => {
    const slightlySharp = 440 * 2 ** (3 / 1200)
    expect(getCents(slightlySharp)).toBeGreaterThan(0)
  })
})

describe('getCentsFromTarget', () => {
  it('is 0 when detected equals target', () => {
    expect(getCentsFromTarget(82.41, 82.41)).toBe(0)
  })

  it('is negative when detected is flat vs target', () => {
    expect(getCentsFromTarget(82.0, 82.41)).toBeLessThan(0)
  })
})
