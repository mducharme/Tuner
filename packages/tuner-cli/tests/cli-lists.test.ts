import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { devicesRef } = vi.hoisted(() => ({
  devicesRef: {
    current: [] as Array<{
      index: number
      name: string
      isDefault: boolean
      defaultSampleRate: number
    }>,
  },
}))

vi.mock('decibri', () => ({
  default: {
    devices: () => devicesRef.current,
  },
}))

import {
  listAudioDevices,
  listInstruments,
  listTunings,
} from '../src/cli-lists.js'

describe('cli-lists', () => {
  beforeEach(() => {
    devicesRef.current = []
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('listAudioDevices explains when there are no devices', () => {
    listAudioDevices()
    expect(console.log).toHaveBeenCalledWith('No input devices found.')
  })

  it('listAudioDevices prints index, name, default marker, and rate', () => {
    devicesRef.current = [
      { index: 0, name: 'Mic', isDefault: true, defaultSampleRate: 48000 },
      { index: 2, name: 'Line In', isDefault: false, defaultSampleRate: 44100 },
    ]
    listAudioDevices()
    expect(console.log).toHaveBeenCalledWith('  [0] Mic (default)  48000 Hz')
    expect(console.log).toHaveBeenCalledWith('  [2] Line In  44100 Hz')
  })

  it('listInstruments prints tuner-core instruments', () => {
    listInstruments()
    expect(console.log).toHaveBeenCalled()
    const lines = vi.mocked(console.log).mock.calls.map((c) => c[0] as string)
    expect(lines.some((line) => line.includes('guitar'))).toBe(true)
  })

  it('listTunings returns false and logs for unknown instrument', () => {
    const ok = listTunings('not-an-instrument')
    expect(ok).toBe(false)
    expect(console.error).toHaveBeenCalledWith(
      'Unknown instrument: not-an-instrument',
    )
  })

  it('listTunings returns true and prints tunings for guitar', () => {
    const ok = listTunings('guitar')
    expect(ok).toBe(true)
    expect(console.log).toHaveBeenCalled()
    const lines = vi.mocked(console.log).mock.calls.map((c) => c[0] as string)
    expect(lines.some((line) => line.includes('guitar-standard'))).toBe(true)
  })
})
