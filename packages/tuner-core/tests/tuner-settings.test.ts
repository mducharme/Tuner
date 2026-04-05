import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TUNER_SETTINGS,
  applySettingsPatch,
  mergeTunerSettings,
} from '../src/tuner-settings.js'

describe('mergeTunerSettings', () => {
  it('starts from defaults when called with no args', () => {
    const s = mergeTunerSettings()
    expect(s.pitchDetector).toBe(DEFAULT_TUNER_SETTINGS.pitchDetector)
    expect(s.detector.minFrequency).toBe(
      DEFAULT_TUNER_SETTINGS.detector.minFrequency,
    )
  })

  it('overrides rmsThreshold', () => {
    const s = mergeTunerSettings({ detector: { rmsThreshold: 0.05 } })
    expect(s.detector.rmsThreshold).toBe(0.05)
    expect(s.detector.minFrequency).toBe(
      DEFAULT_TUNER_SETTINGS.detector.minFrequency,
    )
  })

  it('overrides top-level and deep-merges detector.pyin', () => {
    const s = mergeTunerSettings({
      pitchDetector: 'mpm',
      detector: { minFrequency: 70, pyin: { yinSharpness: 99 } },
    })
    expect(s.pitchDetector).toBe('mpm')
    expect(s.detector.minFrequency).toBe(70)
    expect(s.detector.pyin.yinSharpness).toBe(99)
    expect(s.detector.pyin.transitionSigmaSemitones).toBe(
      DEFAULT_TUNER_SETTINGS.detector.pyin.transitionSigmaSemitones,
    )
  })
})

describe('applySettingsPatch', () => {
  it('preserves unspecified nested pyin fields', () => {
    const current = mergeTunerSettings({
      detector: { pyin: { yinSharpness: 20, maxJumpSemitones: 3 } },
    })
    const next = applySettingsPatch(current, {
      detector: { pyin: { yinSharpness: 21 } },
    })
    expect(next.detector.pyin.yinSharpness).toBe(21)
    expect(next.detector.pyin.maxJumpSemitones).toBe(3)
  })

  it('applies top-level fields without touching nested detector when omitted', () => {
    const current = mergeTunerSettings({
      medianWindowSize: 9,
      detector: { minFrequency: 65 },
    })
    const next = applySettingsPatch(current, { minConfidence: 0.4 })
    expect(next.minConfidence).toBe(0.4)
    expect(next.medianWindowSize).toBe(9)
    expect(next.detector.minFrequency).toBe(65)
  })

  it('replaces detector slice but deep-merges pyin', () => {
    const current = mergeTunerSettings({
      detector: { pyin: { yinSharpness: 7, logUvToUv: -0.2 } },
    })
    const next = applySettingsPatch(current, {
      detector: { clarityThreshold: 0.33, pyin: { yinSharpness: 8 } },
    })
    expect(next.detector.clarityThreshold).toBe(0.33)
    expect(next.detector.pyin.yinSharpness).toBe(8)
    expect(next.detector.pyin.logUvToUv).toBe(-0.2)
  })
})
