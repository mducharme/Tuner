import { expect } from 'vitest'

/** Asserts a detector returned a frequency and narrows the type for follow-up expectations. */
export function expectDetectedHz(f: number | null): number {
  expect(f).not.toBeNull()
  if (f === null) {
    throw new Error('expected a detected pitch in Hz')
  }
  return f
}

/** Synthetic sine for detector / session tests. */
export function generateSine(
  frequency: number,
  sampleRate: number,
  samples: number,
): Float32Array {
  const buffer = new Float32Array(samples)
  for (let i = 0; i < samples; i++) {
    buffer[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate)
  }
  return buffer
}
