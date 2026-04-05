/**
 * Shared YIN cumulative mean normalized difference (Cheveigné & Kawahara).
 * Used by YinDetector and PyinDetector.
 */

export interface YinCmndBuffer {
  yin: Float32Array
  tauMin: number
  tauMax: number
  rms: number
}

export function computeYinCmnd(
  samples: Float32Array,
  sampleRate: number,
  minFrequency: number,
  maxFrequency: number,
): YinCmndBuffer | null {
  const n = samples.length
  if (n < 4) {
    return null
  }

  let rms = 0
  for (let i = 0; i < n; i++) {
    const v = samples[i] ?? 0
    rms += v * v
  }
  rms = Math.sqrt(rms / n)

  const tauMin = Math.max(1, Math.ceil(sampleRate / maxFrequency))
  const tauMaxFreq = Math.floor(sampleRate / minFrequency)
  const tauMaxWin = Math.floor(n / 2) - 1
  const tauMax = Math.min(tauMaxFreq, tauMaxWin)
  if (tauMin > tauMax) {
    return null
  }

  const d = new Float32Array(tauMax + 1)
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0
    for (let j = 0; j < n - tau; j++) {
      const diff = (samples[j] ?? 0) - (samples[j + tau] ?? 0)
      sum += diff * diff
    }
    d[tau] = sum
  }

  const yin = new Float32Array(tauMax + 1)
  yin[0] = 1
  let running = 0
  for (let tau = 1; tau <= tauMax; tau++) {
    running += d[tau] ?? 0
    yin[tau] = running > 0 ? ((d[tau] ?? 0) * tau) / running : 1
  }

  return { yin, tauMin, tauMax, rms }
}

export function yinAtTau(
  yin: Float32Array,
  tauMax: number,
  tau: number,
): number {
  if (tau <= 1) {
    return yin[1] ?? 1
  }
  if (tau >= tauMax) {
    return yin[tauMax] ?? 1
  }
  const t0 = Math.floor(tau)
  const t1 = t0 + 1
  const f = tau - t0
  return (yin[t0] ?? 1) * (1 - f) + (yin[t1] ?? 1) * f
}
