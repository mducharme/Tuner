import {
  frequencyToMidi,
  getCents,
  getCentsFromTarget,
  midiToNote,
  midiToOctave,
} from './notes.js'
import type { TunerSettings } from './tuner-settings.js'
import { mergeTunerSettings } from './tuner-settings.js'
import type {
  AudioProvider,
  PitchDetector,
  TunerEventListener,
  TunerEventMap,
  TunerResult,
  Tuning,
  UserPreferences,
} from './types.js'
import { median } from './utils/median.js'

const DEFAULT_CENTS_THRESHOLD = 5

type EventListeners = {
  [K in keyof TunerEventMap]: Set<TunerEventListener<K>>
}

export class TunerSession {
  private readonly audio: AudioProvider
  private readonly detector: PitchDetector
  private readonly settings: TunerSettings
  private activeTuning: Tuning | null = null
  private centsThreshold: number = DEFAULT_CENTS_THRESHOLD
  private running = false

  private freqWindow: number[] = []
  private lastHeldHz: number | null = null

  private listeners: EventListeners = {
    result: new Set(),
    started: new Set(),
    stopped: new Set(),
    error: new Set(),
  }

  constructor(
    audio: AudioProvider,
    detector: PitchDetector,
    settings?: Partial<TunerSettings>,
  ) {
    this.audio = audio
    this.detector = detector
    this.settings = mergeTunerSettings(settings)
  }

  // ─── Configuration ──────────────────────────────────────────────────────────

  setTuning(tuning: Tuning | null): void {
    this.activeTuning = tuning
  }

  applyPreferences(prefs: Partial<UserPreferences>): void {
    if (prefs.centsThreshold !== undefined) {
      this.centsThreshold = prefs.centsThreshold
    }
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.running) return
    try {
      this.audio.onFrame((samples) => this.processFrame(samples))
      await this.audio.start()
      this.running = true
      this.emit('started', undefined as undefined)
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)))
    }
  }

  stop(): void {
    if (!this.running) return
    this.audio.stop()
    this.running = false
    this.freqWindow = []
    this.lastHeldHz = null
    this.detector.reset?.()
    this.emit('stopped', undefined as undefined)
  }

  get isRunning(): boolean {
    return this.running
  }

  // ─── Events ──────────────────────────────────────────────────────────────────

  on<K extends keyof TunerEventMap>(
    event: K,
    listener: TunerEventListener<K>,
  ): void {
    ;(this.listeners[event] as Set<TunerEventListener<K>>).add(listener)
  }

  off<K extends keyof TunerEventMap>(
    event: K,
    listener: TunerEventListener<K>,
  ): void {
    ;(this.listeners[event] as Set<TunerEventListener<K>>).delete(listener)
  }

  private emit<K extends keyof TunerEventMap>(
    event: K,
    payload: TunerEventMap[K],
  ): void {
    for (const listener of this.listeners[event]) {
      ;(listener as TunerEventListener<K>)(payload)
    }
  }

  // ─── Processing ──────────────────────────────────────────────────────────────

  private processFrame(samples: Float32Array): void {
    const sampleRate = this.audio.getSampleRate()
    const { frequency: rawHz, confidence } = this.detector.detect(
      samples,
      sampleRate,
    )
    if (rawHz === null) {
      this.freqWindow = []
      return
    }

    const w = this.settings.medianWindowSize
    const windowSize = w < 1 ? 1 : w
    this.freqWindow.push(rawHz)
    while (this.freqWindow.length > windowSize) {
      this.freqWindow.shift()
    }

    const medianHz = median(this.freqWindow)

    let displayHz: number
    if (confidence >= this.settings.minConfidence) {
      this.lastHeldHz = medianHz
      displayHz = medianHz
    } else {
      displayHz = this.lastHeldHz ?? medianHz
    }

    const midi = frequencyToMidi(displayHz)
    const result: TunerResult = {
      frequency: displayHz,
      note: midiToNote(midi),
      octave: midiToOctave(midi),
      cents: getCents(displayHz),
      closestString: this.findClosestString(displayHz),
      tuningStrings: this.activeTuning ? [...this.activeTuning.strings] : null,
    }

    this.emit('result', result)
  }

  private findClosestString(frequency: number) {
    if (!this.activeTuning) return null

    let closest = null
    let minAbsCents = Number.POSITIVE_INFINITY

    for (const string of this.activeTuning.strings) {
      const centsOff = getCentsFromTarget(frequency, string.frequency)
      const absCents = Math.abs(centsOff)
      if (absCents < minAbsCents) {
        minAbsCents = absCents
        closest = {
          name: string.name,
          targetFrequency: string.frequency,
          centsOff,
          inTune: absCents <= this.centsThreshold,
        }
      }
    }

    return closest
  }
}
