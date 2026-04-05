import { describe, expect, it } from 'vitest'
import { AutocorrelationDetector } from '../src/detectors/autocorrelation.js'
import { expectDetectedHz, generateSine } from './test-utils.js'

/** 44000/440 = 100 samples/period — integer period stabilizes autocorrelation. */
const SAMPLE_RATE_A4 = 44000
const SAMPLES = 32768

describe('AutocorrelationDetector', () => {
  it('detects 440 Hz sine within ±2 Hz (integer-period sample rate)', () => {
    const detector = new AutocorrelationDetector()
    const samples = generateSine(440, SAMPLE_RATE_A4, SAMPLES)
    const { frequency, confidence } = detector.detect(samples, SAMPLE_RATE_A4)
    const hz = expectDetectedHz(frequency)
    expect(hz).toBeGreaterThan(438)
    expect(hz).toBeLessThan(442)
    expect(confidence).toBeGreaterThan(0)
    expect(confidence).toBeLessThanOrEqual(1)
  })

  /** E2-class pitch: choose rate/period so lag is integral (≈82.43 Hz). */
  it('detects low string pitch within ±2 Hz', () => {
    const sampleRate = 44100
    const period = 535
    const expectedHz = sampleRate / period
    const detector = new AutocorrelationDetector()
    const samples = generateSine(expectedHz, sampleRate, SAMPLES)
    const { frequency } = detector.detect(samples, sampleRate)
    const hz = expectDetectedHz(frequency)
    expect(hz).toBeGreaterThan(expectedHz - 2)
    expect(hz).toBeLessThan(expectedHz + 2)
  })

  it('returns null frequency for silence (RMS below threshold)', () => {
    const detector = new AutocorrelationDetector()
    const samples = new Float32Array(SAMPLES)
    const { frequency, confidence } = detector.detect(samples, SAMPLE_RATE_A4)
    expect(frequency).toBeNull()
    expect(confidence).toBe(0)
  })

  it('returns null for very low frequency outside min range', () => {
    const detector = new AutocorrelationDetector({
      minFrequency: 60,
      clarityThreshold: 0.85,
    })
    const sampleRate = 44100
    const samples = generateSine(30, sampleRate, SAMPLES)
    const { frequency } = detector.detect(samples, sampleRate)
    expect(frequency).toBeNull()
  })

  it('returns null for very high frequency outside max range', () => {
    const detector = new AutocorrelationDetector({
      maxFrequency: 1400,
      clarityThreshold: 0.85,
    })
    const sampleRate = 44100
    const samples = generateSine(2000, sampleRate, SAMPLES)
    const { frequency } = detector.detect(samples, sampleRate)
    expect(frequency).toBeNull()
  })
})
