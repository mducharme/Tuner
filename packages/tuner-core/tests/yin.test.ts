import { describe, expect, it } from 'vitest'
import { YinDetector } from '../src/detectors/yin.js'
import { expectDetectedHz, generateSine } from './test-utils.js'

const SAMPLE_RATE_A4 = 44000
const SAMPLES = 32768

describe('YinDetector', () => {
  it('detects 440 Hz sine within ±2 Hz (integer-period sample rate)', () => {
    const detector = new YinDetector({ threshold: 0.2 })
    const samples = generateSine(440, SAMPLE_RATE_A4, SAMPLES)
    const { frequency, confidence } = detector.detect(samples, SAMPLE_RATE_A4)
    const hz = expectDetectedHz(frequency)
    expect(hz).toBeGreaterThan(438)
    expect(hz).toBeLessThan(442)
    expect(confidence).toBeGreaterThan(0.5)
  })

  it('detects low string pitch within ±2 Hz', () => {
    const sampleRate = 44100
    const period = 535
    const expectedHz = sampleRate / period
    const detector = new YinDetector({ threshold: 0.2 })
    const samples = generateSine(expectedHz, sampleRate, SAMPLES)
    const { frequency } = detector.detect(samples, sampleRate)
    const hz = expectDetectedHz(frequency)
    expect(hz).toBeGreaterThan(expectedHz - 2)
    expect(hz).toBeLessThan(expectedHz + 2)
  })

  it('returns null frequency for silence', () => {
    const detector = new YinDetector()
    const samples = new Float32Array(SAMPLES)
    const { frequency, confidence } = detector.detect(samples, SAMPLE_RATE_A4)
    expect(frequency).toBeNull()
    expect(confidence).toBe(0)
  })

  it('rejects very low fundamental outside range', () => {
    const detector = new YinDetector({ minFrequency: 60, threshold: 0.12 })
    const sampleRate = 44100
    const samples = generateSine(30, sampleRate, SAMPLES)
    const { frequency } = detector.detect(samples, sampleRate)
    expect(frequency).toBeNull()
  })

  it('does not report ~2000 Hz when maxFrequency caps the search', () => {
    const detector = new YinDetector({ maxFrequency: 1400, threshold: 0.12 })
    const sampleRate = 44100
    const samples = generateSine(2000, sampleRate, SAMPLES)
    const { frequency } = detector.detect(samples, sampleRate)
    // Fundamental lies above the band; a subharmonic may still look periodic in-range.
    expect(frequency === null || frequency < 1800).toBe(true)
  })
})
