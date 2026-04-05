import type { PitchDetection, PitchDetector } from '../types.js'
import { computeYinCmnd } from './yin-cmnd.js'

/**
 * YIN pitch estimator (Cheveigné & Kawahara).
 * Generally more robust than raw autocorrelation on real signals, especially low notes.
 */
export class YinDetector implements PitchDetector {
  private readonly minFrequency: number
  private readonly maxFrequency: number
  /** Cumulative mean normalized difference; typical 0.10–0.20 */
  private readonly threshold: number
  private readonly rmsThreshold: number

  constructor({
    minFrequency = 60,
    maxFrequency = 1400,
    threshold = 0.15,
    rmsThreshold = 0.01,
  } = {}) {
    this.minFrequency = minFrequency
    this.maxFrequency = maxFrequency
    this.threshold = threshold
    this.rmsThreshold = rmsThreshold
  }

  detect(samples: Float32Array, sampleRate: number): PitchDetection {
    const cmnd = computeYinCmnd(
      samples,
      sampleRate,
      this.minFrequency,
      this.maxFrequency,
    )
    if (!cmnd || cmnd.rms < this.rmsThreshold) {
      return { frequency: null, confidence: 0 }
    }

    const { yin, tauMin, tauMax } = cmnd

    let bestTau = -1
    let bestVal = 1
    for (let tau = tauMin; tau <= tauMax; tau++) {
      const y = yin[tau] ?? 1
      if (y < this.threshold) {
        let t = tau
        while (t + 1 <= tauMax && (yin[t + 1] ?? 1) < (yin[t] ?? 1)) {
          t++
        }
        bestTau = t
        bestVal = yin[t] ?? 1
        break
      }
    }

    if (bestTau < 0 || bestVal >= this.threshold || !Number.isFinite(bestVal)) {
      const confidence = Number.isFinite(bestVal)
        ? Math.max(0, Math.min(1, 1 - bestVal))
        : 0
      return { frequency: null, confidence }
    }

    let refinedTau = bestTau
    if (bestTau > 1 && bestTau < tauMax) {
      const y0 = yin[bestTau - 1] ?? 1
      const y1 = yin[bestTau] ?? 1
      const y2 = yin[bestTau + 1] ?? 1
      const denom = y0 - 2 * y1 + y2
      if (Math.abs(denom) > 1e-14) {
        const offset = (y0 - y2) / (2 * denom)
        refinedTau = bestTau + Math.max(-1, Math.min(1, offset))
      }
    }

    const frequency = sampleRate / refinedTau
    if (frequency < this.minFrequency || frequency > this.maxFrequency) {
      return {
        frequency: null,
        confidence: Math.max(0, Math.min(1, 1 - bestVal)),
      }
    }

    const confidence = Math.max(0, Math.min(1, 1 - bestVal))
    return { frequency, confidence }
  }
}
