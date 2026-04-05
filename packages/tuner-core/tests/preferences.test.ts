import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFERENCES } from '../src/preferences.js'

describe('DEFAULT_PREFERENCES', () => {
  it('matches the documented defaults for persisted UI state', () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      centsThreshold: 5,
      customTunings: [],
      lastInstrumentId: null,
      lastTuningId: null,
    })
  })
})
