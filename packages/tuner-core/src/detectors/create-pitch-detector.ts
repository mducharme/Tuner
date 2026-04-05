import type { TunerSettings } from '../tuner-settings.js'
import type { PitchDetector } from '../types.js'
import { AutocorrelationDetector } from './autocorrelation.js'
import { MpmDetector } from './mpm.js'
import { PyinDetector } from './pyin.js'
import { YinDetector } from './yin.js'

export function createPitchDetector(settings: TunerSettings): PitchDetector {
  const d = settings.detector
  const bounds = { minFrequency: d.minFrequency, maxFrequency: d.maxFrequency }

  if (settings.pitchDetector === 'autocorrelation') {
    return new AutocorrelationDetector({
      ...bounds,
      clarityThreshold: d.clarityThreshold,
    })
  }

  if (settings.pitchDetector === 'pyin') {
    const p = d.pyin
    return new PyinDetector({
      ...bounds,
      yinSharpness: p.yinSharpness,
      transitionSigmaSemitones: p.transitionSigmaSemitones,
      maxJumpSemitones: p.maxJumpSemitones,
      logPitchToUv: p.logPitchToUv,
      logUvToPitch: p.logUvToPitch,
      logUvToUv: p.logUvToUv,
      firstDipSemitoneWeight: p.firstDipSemitoneWeight,
      firstDipThreshold: p.firstDipThreshold,
    })
  }

  if (settings.pitchDetector === 'mpm') {
    return new MpmDetector({
      ...bounds,
      peakThreshold: d.mpmPeakThreshold,
    })
  }

  return new YinDetector({
    ...bounds,
    threshold: d.yinThreshold,
  })
}
