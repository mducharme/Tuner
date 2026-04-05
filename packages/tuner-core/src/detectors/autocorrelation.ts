import type { PitchDetection, PitchDetector } from '../types.js'

/**
 * Autocorrelation-based pitch detector.
 * Fast and simple — good enough for v1, swappable for YIN/McLeod later.
 */
export class AutocorrelationDetector implements PitchDetector {
  private readonly minFrequency: number
  private readonly maxFrequency: number
  private readonly clarityThreshold: number

  constructor({
    minFrequency = 60, // ~B1, covers bass guitar low B
    maxFrequency = 1400, // covers most instruments
    // Mic + room noise yields much lower "clarity" than synthetic sines; 0.9 rejected almost all real input.
    clarityThreshold = 0.2,
  } = {}) {
    this.minFrequency = minFrequency
    this.maxFrequency = maxFrequency
    this.clarityThreshold = clarityThreshold
  }

  detect(samples: Float32Array, sampleRate: number): PitchDetection {
    const minPeriod = Math.ceil(sampleRate / this.maxFrequency)
    const maxPeriod = Math.floor(sampleRate / this.minFrequency)
    const n = samples.length

    let bestPeriod = -1
    let bestCorrelation = 0

    let rms = 0
    for (let i = 0; i < n; i++) {
      rms += (samples[i] ?? 0) * (samples[i] ?? 0)
    }
    rms = Math.sqrt(rms / n)
    if (rms < 0.01) {
      return { frequency: null, confidence: 0 }
    }

    for (let period = minPeriod; period <= maxPeriod; period++) {
      let correlation = 0
      for (let i = 0; i < n - period; i++) {
        correlation += (samples[i] ?? 0) * (samples[i + period] ?? 0)
      }
      correlation /= n - period

      if (correlation > bestCorrelation) {
        bestCorrelation = correlation
        bestPeriod = period
      }
    }

    if (bestPeriod === -1) {
      return { frequency: null, confidence: 0 }
    }

    let maxValue = 0
    for (let i = 0; i < n; i++) {
      maxValue = Math.max(maxValue, Math.abs(samples[i] ?? 0))
    }
    const clarity = maxValue > 0 ? bestCorrelation / (maxValue * maxValue) : 0
    const confidence = Math.min(1, Math.max(0, clarity))

    if (clarity < this.clarityThreshold) {
      return { frequency: null, confidence }
    }

    return {
      frequency: sampleRate / bestPeriod,
      confidence,
    }
  }
}
