// Types
export type {
  AudioProvider,
  PitchDetection,
  PitchDetector,
  StringDef,
  Tuning,
  Instrument,
  ClosestString,
  TunerResult,
  HapticsProvider,
  UserPreferences,
  PreferencesProvider,
  TunerEventMap,
  TunerEventListener,
} from './types.js'

// Session
export { TunerSession } from './session.js'

// Note utilities
export {
  frequencyToMidi,
  midiToFrequency,
  midiToNote,
  midiToOctave,
  getCents,
  getCentsFromTarget,
} from './notes.js'

// Detectors
export { AutocorrelationDetector } from './detectors/autocorrelation.js'
export { YinDetector } from './detectors/yin.js'
export { PyinDetector } from './detectors/pyin.js'
export { MpmDetector } from './detectors/mpm.js'
export { createPitchDetector } from './detectors/create-pitch-detector.js'

// Tuning data
export { INSTRUMENTS, findInstrument, findTuning } from './tunings.js'

// Preferences
export { DEFAULT_PREFERENCES } from './preferences.js'

// Engine / pipeline settings (buffers, detectors, smoothing)
export type {
  TunerSettings,
  DetectorSettings,
  PitchDetectorKind,
  PyinHMMSettings,
} from './tuner-settings.js'
export {
  DEFAULT_TUNER_SETTINGS,
  mergeTunerSettings,
  applySettingsPatch,
} from './tuner-settings.js'
