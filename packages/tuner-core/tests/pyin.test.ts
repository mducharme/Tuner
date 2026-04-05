import { describe, expect, it } from 'vitest'
import { PyinDetector } from '../src/detectors/pyin.js'
import { expectDetectedHz, generateSine } from './test-utils.js'

const SAMPLE_RATE_A4 = 44000
const SAMPLES = 32768

describe('PyinDetector', () => {
  it('detects 440 Hz sine near A4 (semitone grid)', () => {
    const detector = new PyinDetector()
    const samples = generateSine(440, SAMPLE_RATE_A4, SAMPLES)
    const { frequency, confidence } = detector.detect(samples, SAMPLE_RATE_A4)
    const hz = expectDetectedHz(frequency)
    expect(hz).toBeCloseTo(440, 0)
    expect(confidence).toBeGreaterThan(0.4)
  })

  it('tracks low pitch on semitone grid', () => {
    const sampleRate = 44100
    const period = 535
    const expectedHz = sampleRate / period
    const detector = new PyinDetector()
    const samples = generateSine(expectedHz, sampleRate, SAMPLES)
    const { frequency } = detector.detect(samples, sampleRate)
    const hz = expectDetectedHz(frequency)
    expect(Math.abs(hz - expectedHz)).toBeLessThan(12)
  })

  it('returns null when silent', () => {
    const detector = new PyinDetector()
    const samples = new Float32Array(SAMPLES)
    const { frequency, confidence } = detector.detect(samples, SAMPLE_RATE_A4)
    expect(frequency).toBeNull()
    expect(confidence).toBe(0)
  })

  it('reset clears HMM memory', () => {
    const detector = new PyinDetector()
    const samples = generateSine(440, SAMPLE_RATE_A4, SAMPLES)
    detector.detect(samples, SAMPLE_RATE_A4)
    detector.reset()
    const again = detector.detect(samples, SAMPLE_RATE_A4)
    expect(again.frequency).not.toBeNull()
  })
})
