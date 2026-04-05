// ─── Host / platform (injected by app — web, Capacitor, CLI, tests) ─────────

export interface AudioProvider {
  getSampleRate(): number
  onFrame(callback: (samples: Float32Array) => void): void
  start(): Promise<void>
  stop(): void
}

/** Optional tactile feedback; core may call through a host-provided instance. */
export interface HapticsProvider {
  inTune(): void
  close(): void // close but not there yet
}

// ─── Pitch Detection ─────────────────────────────────────────────────────────

/** Detector output; `confidence` is 0…1 (0 when no pitch). */
export interface PitchDetection {
  frequency: number | null
  confidence: number
}

export interface PitchDetector {
  detect(samples: Float32Array, sampleRate: number): PitchDetection
  /** Clear temporal state (e.g. PYIN HMM). Optional. */
  reset?(): void
}

// ─── Tuning Registry ─────────────────────────────────────────────────────────

export interface StringDef {
  name: string // e.g. "E2", "A4"
  frequency: number // Hz
}

export interface Tuning {
  id: string
  name: string // e.g. "Standard", "Drop D", "DADGAD"
  strings: StringDef[]
}

export interface Instrument {
  id: string
  name: string // e.g. "Guitar", "Bass", "Ukulele"
  tunings: Tuning[]
}

// ─── Tuner Result ─────────────────────────────────────────────────────────────

export interface ClosestString {
  name: string
  targetFrequency: number
  centsOff: number
  inTune: boolean
}

export interface TunerResult {
  frequency: number
  note: string // e.g. "A"
  octave: number // e.g. 4
  cents: number // -50 to +50 from nearest semitone
  closestString: ClosestString | null
  /** Active tuning courses for UI; null when no tuning is selected. */
  tuningStrings: StringDef[] | null
}

// ─── Storage / user preferences (persisted app state — not `TunerSettings`) ──

export interface UserPreferences {
  centsThreshold: number // default: 5
  customTunings: Tuning[]
  lastInstrumentId: string | null
  lastTuningId: string | null
}

export interface PreferencesProvider {
  load(): Promise<UserPreferences>
  save(prefs: UserPreferences): Promise<void>
}

// ─── Session Events ───────────────────────────────────────────────────────────

export type TunerEventMap = {
  result: TunerResult
  started: undefined
  stopped: undefined
  error: Error
}

export type TunerEventListener<K extends keyof TunerEventMap> = (
  payload: TunerEventMap[K],
) => void
