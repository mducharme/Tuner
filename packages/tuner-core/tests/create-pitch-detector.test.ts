import { describe, expect, it } from 'vitest'
import { AutocorrelationDetector } from '../src/detectors/autocorrelation.js'
import { createPitchDetector } from '../src/detectors/create-pitch-detector.js'
import { MpmDetector } from '../src/detectors/mpm.js'
import { PyinDetector } from '../src/detectors/pyin.js'
import { YinDetector } from '../src/detectors/yin.js'
import { mergeTunerSettings } from '../src/tuner-settings.js'

describe('createPitchDetector', () => {
  it('returns PyinDetector by default', () => {
    const d = createPitchDetector(mergeTunerSettings())
    expect(d).toBeInstanceOf(PyinDetector)
  })

  it('returns YinDetector when configured', () => {
    const d = createPitchDetector(mergeTunerSettings({ pitchDetector: 'yin' }))
    expect(d).toBeInstanceOf(YinDetector)
  })

  it('returns AutocorrelationDetector when configured', () => {
    const d = createPitchDetector(
      mergeTunerSettings({ pitchDetector: 'autocorrelation' }),
    )
    expect(d).toBeInstanceOf(AutocorrelationDetector)
  })

  it('returns PyinDetector when configured', () => {
    const d = createPitchDetector(mergeTunerSettings({ pitchDetector: 'pyin' }))
    expect(d).toBeInstanceOf(PyinDetector)
  })

  it('returns MpmDetector when configured', () => {
    const d = createPitchDetector(mergeTunerSettings({ pitchDetector: 'mpm' }))
    expect(d).toBeInstanceOf(MpmDetector)
  })
})
