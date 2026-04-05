/**
 * Engine / pipeline knobs: audio frame size, pitch detector choice, frequency smoothing
 * (`medianWindowSize`), confidence gating, and per-detector parameters (bands, thresholds,
 * PYIN HMM). These affect latency vs stability and how `TunerSession` interprets audio — not
 * persisted “user preferences” like last selected instrument (see `UserPreferences` in
 * `types.ts` and `DEFAULT_PREFERENCES` in `preferences.ts`).
 *
 * Tune defaults here when experimenting globally; apps can merge overrides via
 * `mergeTunerSettings` / `applySettingsPatch`.
 */

export type PitchDetectorKind = 'mpm' | 'pyin' | 'yin' | 'autocorrelation'

/** HMM / observation shaping for {@link PyinDetector} */
export interface PyinHMMSettings {
  yinSharpness: number
  transitionSigmaSemitones: number
  maxJumpSemitones: number
  logPitchToUv: number
  logUvToPitch: number
  logUvToUv: number
  /**
   * Penalty (per semitone²) tying observations to the first YIN CMND dip
   * (same idea as classic YIN’s “first τ below threshold”) to avoid subharmonics.
   */
  firstDipSemitoneWeight: number
  /** CMND level used to locate that first dip for the hint */
  firstDipThreshold: number
}

export interface DetectorSettings {
  minFrequency: number
  maxFrequency: number
  /** Autocorrelation: minimum normalized clarity */
  clarityThreshold: number
  /** YIN: cumulative mean normalized difference gate (typ. 0.10–0.20) */
  yinThreshold: number
  /** MPM: minimum NSDF peak height before accepting a period (typ. 0.85–0.95) */
  mpmPeakThreshold: number
  pyin: PyinHMMSettings
}

export interface TunerSettings {
  /**
   * Samples per analysis frame (web/Capacitor capture buffer).
   * Larger → better low-string resolution, more latency (~ frame / sampleRate).
   */
  audioFrameSamples: number
  /** How many recent raw frequencies feed the median filter; 1 disables smoothing */
  medianWindowSize: number
  /**
   * 0…1 from the detector; below this the session keeps emitting the last confident pitch.
   */
  minConfidence: number
  pitchDetector: PitchDetectorKind
  detector: DetectorSettings
}

/** Defaults tuned for monophonic instrument tuning (stable needle, few false subharmonics). */
const DEFAULT_PYIN_HMM: PyinHMMSettings = {
  yinSharpness: 12,
  transitionSigmaSemitones: 1.35,
  maxJumpSemitones: 10,
  logPitchToUv: -3.2,
  logUvToPitch: -2.8,
  logUvToUv: -0.15,
  firstDipSemitoneWeight: 0.14,
  firstDipThreshold: 0.18,
}

export const DEFAULT_TUNER_SETTINGS: TunerSettings = {
  audioFrameSamples: 4096,
  medianWindowSize: 7,
  minConfidence: 0.28,
  pitchDetector: 'yin',
  detector: {
    minFrequency: 60,
    maxFrequency: 1400,
    clarityThreshold: 0.2,
    yinThreshold: 0.15,
    mpmPeakThreshold: 0.88,
    pyin: { ...DEFAULT_PYIN_HMM },
  },
}

export function mergeTunerSettings(
  overrides?: Partial<TunerSettings>,
): TunerSettings {
  const base = DEFAULT_TUNER_SETTINGS
  const det = overrides?.detector
  const py = det?.pyin
  return {
    ...base,
    ...overrides,
    detector: {
      ...base.detector,
      ...det,
      pyin: {
        ...base.detector.pyin,
        ...py,
      },
    },
  }
}

/** Merge a partial update into the current settings (preserves unspecified nested keys). */
export function applySettingsPatch(
  current: TunerSettings,
  patch: Partial<TunerSettings>,
): TunerSettings {
  const det = patch.detector
  return {
    ...current,
    ...patch,
    detector: {
      ...current.detector,
      ...det,
      pyin: {
        ...current.detector.pyin,
        ...(det?.pyin ?? {}),
      },
    },
  }
}
