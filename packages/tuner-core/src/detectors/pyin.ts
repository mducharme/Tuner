import { frequencyToMidi, midiToFrequency } from '../notes.js'
import type { PitchDetection, PitchDetector } from '../types.js'
import { computeYinCmnd, yinAtTau } from './yin-cmnd.js'

const LOG_FLOOR = -1e8

export interface PyinDetectorOptions {
  minFrequency?: number
  maxFrequency?: number
  rmsThreshold?: number
  /** Maps YIN CMND value to emission cost; higher → sharper peaks matter more */
  yinSharpness?: number
  /** Gaussian σ (semitones) for pitch continuity in the HMM */
  transitionSigmaSemitones?: number
  /** Max MIDI index jump per frame when scoring transitions */
  maxJumpSemitones?: number
  /** log P(voiced → unvoiced) */
  logPitchToUv?: number
  /** log P(unvoiced → voiced) */
  logUvToPitch?: number
  /** log P(unvoiced → unvoiced) */
  logUvToUv?: number
  firstDipSemitoneWeight?: number
  firstDipThreshold?: number
}

/**
 * Probabilistic YIN–style observations + discrete-pitch HMM (Viterbi forward step).
 * Stateful: call `reset()` when stopping capture so the Markov chain does not bridge sessions.
 */
export class PyinDetector implements PitchDetector {
  private readonly minFrequency: number
  private readonly maxFrequency: number
  private readonly rmsThreshold: number
  private readonly yinSharpness: number
  private readonly transitionSigmaSemitones: number
  private readonly maxJumpSemitones: number
  private readonly logPitchToUv: number
  private readonly logUvToPitch: number
  private readonly logUvToUv: number
  private readonly firstDipSemitoneWeight: number
  private readonly firstDipThreshold: number

  private readonly midiMin: number
  private readonly midiMax: number
  private readonly nPitch: number
  private readonly uvIndex: number
  private readonly nStates: number

  private prevLog: Float32Array
  private hasPrev = false

  constructor(options: PyinDetectorOptions = {}) {
    this.minFrequency = options.minFrequency ?? 60
    this.maxFrequency = options.maxFrequency ?? 1400
    this.rmsThreshold = options.rmsThreshold ?? 0.01
    this.yinSharpness = options.yinSharpness ?? 12
    this.transitionSigmaSemitones = options.transitionSigmaSemitones ?? 1.35
    this.maxJumpSemitones = options.maxJumpSemitones ?? 10
    this.logPitchToUv = options.logPitchToUv ?? -3.2
    this.logUvToPitch = options.logUvToPitch ?? -2.8
    this.logUvToUv = options.logUvToUv ?? -0.15
    this.firstDipSemitoneWeight = options.firstDipSemitoneWeight ?? 0.14
    this.firstDipThreshold = options.firstDipThreshold ?? 0.18

    this.midiMin = Math.floor(frequencyToMidi(this.minFrequency))
    this.midiMax = Math.ceil(frequencyToMidi(this.maxFrequency))
    this.nPitch = this.midiMax - this.midiMin + 1
    this.uvIndex = this.nPitch
    this.nStates = this.nPitch + 1
    this.prevLog = new Float32Array(this.nStates)
  }

  reset(): void {
    this.hasPrev = false
    this.prevLog.fill(0)
  }

  detect(samples: Float32Array, sampleRate: number): PitchDetection {
    const cmnd = computeYinCmnd(
      samples,
      sampleRate,
      this.minFrequency,
      this.maxFrequency,
    )
    if (!cmnd) {
      this.hasPrev = false
      return { frequency: null, confidence: 0 }
    }
    if (cmnd.rms < this.rmsThreshold) {
      this.hasPrev = false
      return { frequency: null, confidence: 0 }
    }

    const { yin, tauMin, tauMax } = cmnd

    let yMin = 1
    for (let tau = tauMin; tau <= tauMax; tau++) {
      yMin = Math.min(yMin, yin[tau] ?? 1)
    }

    const midiHint = firstDipMidiHint(
      yin,
      tauMin,
      tauMax,
      sampleRate,
      this.firstDipThreshold,
    )

    const emitPitch = new Float32Array(this.nPitch)
    for (let i = 0; i < this.nPitch; i++) {
      const midi = this.midiMin + i
      const f = midiToFrequency(midi)
      if (f < this.minFrequency || f > this.maxFrequency) {
        emitPitch[i] = LOG_FLOOR
        continue
      }
      const tau = sampleRate / f
      if (tau < tauMin || tau > tauMax) {
        emitPitch[i] = LOG_FLOOR
        continue
      }
      const y = yinAtTau(yin, tauMax, tau)
      let logP = -this.yinSharpness * y
      if (midiHint !== null) {
        const dm = midi - midiHint
        logP -= this.firstDipSemitoneWeight * dm * dm
      }
      emitPitch[i] = logP
    }

    const emitUv = -this.yinSharpness * (0.35 + 0.65 * yMin)

    const cur = new Float32Array(this.nStates)
    const twoSigma2 =
      2 * this.transitionSigmaSemitones * this.transitionSigmaSemitones

    if (!this.hasPrev) {
      const uniform = -Math.log(this.nStates)
      for (let j = 0; j < this.nPitch; j++) {
        cur[j] = uniform + (emitPitch.at(j) ?? LOG_FLOOR)
      }
      cur[this.uvIndex] = uniform + emitUv
      this.hasPrev = true
    } else {
      for (let j = 0; j < this.nPitch; j++) {
        let best = LOG_FLOOR
        const mj = this.midiMin + j
        for (let i = 0; i < this.nPitch; i++) {
          const mi = this.midiMin + i
          const dj = Math.abs(mi - mj)
          if (dj > this.maxJumpSemitones) {
            continue
          }
          const trans = -(dj * dj) / twoSigma2
          const v = (this.prevLog.at(i) ?? LOG_FLOOR) + trans
          if (v > best) {
            best = v
          }
        }
        const fromUv =
          (this.prevLog.at(this.uvIndex) ?? LOG_FLOOR) + this.logUvToPitch
        if (fromUv > best) {
          best = fromUv
        }
        cur[j] = best + (emitPitch.at(j) ?? LOG_FLOOR)
      }

      let bestUv = LOG_FLOOR
      for (let i = 0; i < this.nPitch; i++) {
        const v = (this.prevLog.at(i) ?? LOG_FLOOR) + this.logPitchToUv
        if (v > bestUv) {
          bestUv = v
        }
      }
      const uvStay =
        (this.prevLog.at(this.uvIndex) ?? LOG_FLOOR) + this.logUvToUv
      if (uvStay > bestUv) {
        bestUv = uvStay
      }
      cur[this.uvIndex] = bestUv + emitUv
    }

    let bestIdx = 0
    let bestVal = cur.at(0) ?? LOG_FLOOR
    for (let j = 1; j < this.nStates; j++) {
      const cj = cur.at(j) ?? LOG_FLOOR
      if (cj > bestVal) {
        bestVal = cj
        bestIdx = j
      }
    }

    for (let j = 0; j < this.nStates; j++) {
      this.prevLog[j] = cur.at(j) ?? LOG_FLOOR
    }

    if (bestIdx === this.uvIndex) {
      const second = this.secondBestLog(cur, this.uvIndex)
      const confidence = logProbToConfidence(bestVal, second)
      return { frequency: null, confidence }
    }

    const midi = this.midiMin + bestIdx
    const frequency = midiToFrequency(midi)
    const second = this.secondBestLog(cur, bestIdx)
    const confidence = logProbToConfidence(bestVal, second)
    return { frequency, confidence }
  }

  private secondBestLog(cur: Float32Array, exclude: number): number {
    let s = LOG_FLOOR
    for (let j = 0; j < this.nStates; j++) {
      if (j === exclude) {
        continue
      }
      const cj = cur.at(j) ?? LOG_FLOOR
      if (cj > s) {
        s = cj
      }
    }
    return s
  }
}

function logProbToConfidence(best: number, second: number): number {
  const margin = best - second
  const c = 1 / (1 + Math.exp(-margin))
  return Math.max(0, Math.min(1, c))
}

/** MIDI note at the first YIN dip (classic YIN τ pick), for a subharmonic-resistant hint */
function firstDipMidiHint(
  yin: Float32Array,
  tauMin: number,
  tauMax: number,
  sampleRate: number,
  threshold: number,
): number | null {
  let bestTau = -1
  for (let tau = tauMin; tau <= tauMax; tau++) {
    const y = yin[tau] ?? 1
    if (y < threshold) {
      let t = tau
      while (t + 1 <= tauMax && (yin[t + 1] ?? 1) < (yin[t] ?? 1)) {
        t++
      }
      bestTau = t
      break
    }
  }
  if (bestTau < 0) {
    return null
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
  return frequencyToMidi(sampleRate / refinedTau)
}
