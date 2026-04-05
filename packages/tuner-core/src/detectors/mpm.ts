import type { PitchDetection, PitchDetector } from '../types.js'

/**
 * McLeod Pitch Method (MPM) via the Normalized Square Difference Function (NSDF).
 * McLeod & Wyvill — peaks in NSDF indicate candidate periods; we take the first
 * qualifying peak from short τ upward to reduce octave/subharmonic confusion.
 */
export class MpmDetector implements PitchDetector {
  private readonly minFrequency: number
  private readonly maxFrequency: number
  /** Minimum NSDF peak height (0…1, typ. 0.85–0.95) */
  private readonly peakThreshold: number
  private readonly rmsThreshold: number

  constructor({
    minFrequency = 60,
    maxFrequency = 1400,
    peakThreshold = 0.88,
    rmsThreshold = 0.01,
  } = {}) {
    this.minFrequency = minFrequency
    this.maxFrequency = maxFrequency
    this.peakThreshold = peakThreshold
    this.rmsThreshold = rmsThreshold
  }

  detect(samples: Float32Array, sampleRate: number): PitchDetection {
    const n = samples.length
    if (n < 4) {
      return { frequency: null, confidence: 0 }
    }

    let rms = 0
    for (let i = 0; i < n; i++) {
      const v = samples[i] ?? 0
      rms += v * v
    }
    rms = Math.sqrt(rms / n)
    if (rms < this.rmsThreshold) {
      return { frequency: null, confidence: 0 }
    }

    const tauMin = Math.max(1, Math.ceil(sampleRate / this.maxFrequency))
    const tauMaxFreq = Math.floor(sampleRate / this.minFrequency)
    const tauMaxWin = Math.floor(n / 2) - 1
    const tauMax = Math.min(tauMaxFreq, tauMaxWin)
    if (tauMin > tauMax) {
      return { frequency: null, confidence: 0 }
    }

    const nsdf = new Float32Array(tauMax + 1)
    nsdf[0] = 1
    for (let tau = 1; tau <= tauMax; tau++) {
      let num = 0
      let den = 0
      for (let i = 0; i < n - tau; i++) {
        const a = samples[i] ?? 0
        const b = samples[i + tau] ?? 0
        num += a * b
        den += a * a + b * b
      }
      nsdf[tau] = den > 1e-20 ? (2 * num) / den : 0
    }

    const searchLo = Math.max(2, tauMin)
    const searchHi = tauMax - 1
    if (searchLo > searchHi) {
      return { frequency: null, confidence: 0 }
    }

    let peakTau = -1
    let peakVal = 0
    for (let tau = searchLo; tau <= searchHi; tau++) {
      const v = nsdf[tau] ?? 0
      const vp = nsdf[tau - 1] ?? 0
      const vn = nsdf[tau + 1] ?? 0
      if (v >= this.peakThreshold && v >= vp && v >= vn) {
        peakTau = tau
        peakVal = v
        break
      }
    }

    if (peakTau < 0) {
      let best = 0
      for (let tau = searchLo; tau <= searchHi; tau++) {
        best = Math.max(best, nsdf[tau] ?? 0)
      }
      return { frequency: null, confidence: Math.max(0, Math.min(1, best)) }
    }

    let refinedTau = peakTau
    const alpha = nsdf[peakTau - 1] ?? 0
    const beta = nsdf[peakTau] ?? 0
    const gamma = nsdf[peakTau + 1] ?? 0
    const denom = alpha - 2 * beta + gamma
    if (Math.abs(denom) > 1e-12) {
      const offset = (gamma - alpha) / (2 * denom)
      refinedTau = peakTau + Math.max(-1, Math.min(1, offset))
    }

    const frequency = sampleRate / refinedTau
    if (frequency < this.minFrequency || frequency > this.maxFrequency) {
      return { frequency: null, confidence: Math.max(0, Math.min(1, peakVal)) }
    }

    return {
      frequency,
      confidence: Math.max(0, Math.min(1, peakVal)),
    }
  }
}
