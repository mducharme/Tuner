import { describe, expect, it } from 'vitest'
import * as core from '../src/index.js'

describe('package entry (index)', () => {
  it('re-exports session, preferences, tunings, and detectors', () => {
    expect(core.TunerSession).toBeTypeOf('function')
    expect(core.DEFAULT_PREFERENCES).toEqual({
      centsThreshold: 5,
      customTunings: [],
      lastInstrumentId: null,
      lastTuningId: null,
    })
    expect(core.INSTRUMENTS.length).toBeGreaterThan(0)
    expect(core.findInstrument).toBeTypeOf('function')
    expect(core.findTuning).toBeTypeOf('function')

    expect(core.AutocorrelationDetector).toBeTypeOf('function')
    expect(core.YinDetector).toBeTypeOf('function')
    expect(core.PyinDetector).toBeTypeOf('function')
    expect(core.MpmDetector).toBeTypeOf('function')
    expect(core.createPitchDetector).toBeTypeOf('function')

    expect(core.frequencyToMidi(440)).toBeCloseTo(69, 5)
    expect(core.mergeTunerSettings({})).toMatchObject({
      medianWindowSize: expect.any(Number),
    })
  })
})
