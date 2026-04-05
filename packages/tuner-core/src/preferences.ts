/**
 * Persisted app choices (instrument, tuning, cents threshold, custom tunings) — the kind of data
 * a `PreferencesProvider` loads/saves. This is not engine configuration; for buffer size, detector
 * kind, and smoothing see `tuner-settings.ts` and `TunerSettings`.
 */
import type { UserPreferences } from './types.js'

export const DEFAULT_PREFERENCES: UserPreferences = {
  centsThreshold: 5,
  customTunings: [],
  lastInstrumentId: null,
  lastTuningId: null,
}
