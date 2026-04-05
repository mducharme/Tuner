import { describe, expect, it } from 'vitest'
import { AutocorrelationDetector } from '../src/detectors/autocorrelation.js'
import { createPitchDetector } from '../src/detectors/create-pitch-detector.js'
import { MpmDetector } from '../src/detectors/mpm.js'
import { PyinDetector } from '../src/detectors/pyin.js'
import { YinDetector } from '../src/detectors/yin.js'
import { mergeTunerSettings } from '../src/tuner-settings.js'
import { generateSine } from './test-utils.js'

describe('createPitchDetector', () => {
  it('returns YinDetector by default', () => {
    const d = createPitchDetector(mergeTunerSettings())
    expect(d).toBeInstanceOf(YinDetector)
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

  it.each(['yin', 'mpm', 'autocorrelation', 'pyin'] as const)(
    '%s: rmsThreshold set high enough silences a quiet signal',
    (kind) => {
      const sampleRate = 44100
      // Amplitude 0.005 → RMS ≈ 0.0035, below rmsThreshold of 0.1
      const quietSamples = generateSine(440, sampleRate, 4096).map(
        (v) => v * 0.005,
      ) as unknown as Float32Array
      const detector = createPitchDetector(
        mergeTunerSettings({
          pitchDetector: kind,
          detector: { rmsThreshold: 0.1 },
        }),
      )
      const { frequency } = detector.detect(
        new Float32Array(quietSamples),
        sampleRate,
      )
      expect(frequency).toBeNull()
    },
  )
})
