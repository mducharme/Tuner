import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runTunerSession } from '../src/run-tuner-session.js'

function baseArgs() {
  return {
    verbose: false,
    rate: 48000,
    instrumentId: 'guitar',
    tuningExplicit: true,
    tuningId: 'guitar-standard',
    detector: 'yin' as const,
    centsThreshold: 5,
    color: 'auto' as const,
  }
}

describe('runTunerSession (early validation)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.exitCode = 0
  })

  it('sets exit code and returns when instrument is unknown', async () => {
    await runTunerSession({
      ...baseArgs(),
      instrumentId: 'instrument-that-does-not-exist',
    })
    expect(process.exitCode).toBe(1)
    expect(console.error).toHaveBeenCalledWith(
      'Unknown instrument: instrument-that-does-not-exist',
    )
  })

  it('sets exit code and returns when tuning is unknown', async () => {
    await runTunerSession({
      ...baseArgs(),
      instrumentId: 'guitar',
      tuningId: 'not-a-valid-tuning',
    })
    expect(process.exitCode).toBe(1)
    expect(console.error).toHaveBeenCalled()
    const msg = String(vi.mocked(console.error).mock.calls[0]?.[0])
    expect(msg).toContain('Unknown tuning')
    expect(msg).toContain('guitar')
  })
})
