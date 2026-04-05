import { describe, expect, it, vi } from 'vitest'

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

import type { RunCliArgs } from '../src/parsed-cli.js'
import { writeVerboseStartup } from '../src/verbose-startup.js'

function baseArgs(): RunCliArgs {
  return {
    verbose: true,
    rate: 48000,
    instrumentId: 'guitar',
    tuningExplicit: false,
    tuningId: 'guitar-standard',
    detector: 'yin',
    centsThreshold: 5,
    color: 'auto',
  }
}

describe('writeVerboseStartup', () => {
  it('writes configuration lines and handles empty device lists', () => {
    devicesRef.current = []
    const chunks: string[] = []
    const out = {
      write: (s: string) => chunks.push(s),
    } as NodeJS.WritableStream

    writeVerboseStartup(out, {
      args: baseArgs(),
      displayStyle: 'standard',
      isTTY: true,
      stdoutTTY: true,
      instrumentId: 'guitar',
      instrumentName: 'Guitar',
      tuningId: 'guitar-standard',
      tuningName: 'Standard',
      audioFrameSamples: 1024,
      deviceRaw: undefined,
      deviceParsed: undefined,
    })

    const text = chunks.join('')
    expect(text).toContain('tuner: configuration')
    expect(text).toContain('instrument:')
    expect(text).toContain('(no input devices reported)')
  })

  it('describes host default device when none was passed', () => {
    devicesRef.current = [
      { index: 3, name: 'Mic', isDefault: true, defaultSampleRate: 48000 },
    ]
    const chunks: string[] = []
    const out = {
      write: (s: string) => chunks.push(s),
    } as NodeJS.WritableStream

    writeVerboseStartup(out, {
      args: baseArgs(),
      displayStyle: 'ansi',
      isTTY: true,
      stdoutTTY: true,
      instrumentId: 'guitar',
      instrumentName: 'Guitar',
      tuningId: 'guitar-standard',
      tuningName: 'Standard',
      audioFrameSamples: 512,
      deviceRaw: undefined,
      deviceParsed: undefined,
    })

    expect(chunks.join('')).toContain('[3] Mic (host default)')
  })

  it('prefixes with newline when afterChange is true', () => {
    devicesRef.current = []
    const chunks: string[] = []
    const out = {
      write: (s: string) => chunks.push(s),
    } as NodeJS.WritableStream

    writeVerboseStartup(out, {
      args: baseArgs(),
      displayStyle: 'colors',
      isTTY: true,
      stdoutTTY: true,
      instrumentId: 'guitar',
      instrumentName: 'Guitar',
      tuningId: 'guitar-standard',
      tuningName: 'Standard',
      audioFrameSamples: 256,
      deviceRaw: 'Mic',
      deviceParsed: 'mic',
      afterChange: true,
    })

    const text = chunks.join('')
    expect(text.startsWith('\n')).toBe(true)
    expect(text).toContain('updated')
  })

  it('describes device index when it exists', () => {
    devicesRef.current = [
      { index: 2, name: 'USB Mic', isDefault: false, defaultSampleRate: 48000 },
    ]
    const chunks: string[] = []
    const out = {
      write: (s: string) => chunks.push(s),
    } as NodeJS.WritableStream
    writeVerboseStartup(out, {
      args: baseArgs(),
      displayStyle: 'standard',
      isTTY: false,
      stdoutTTY: false,
      instrumentId: 'guitar',
      instrumentName: 'Guitar',
      tuningId: 'guitar-standard',
      tuningName: 'Standard',
      audioFrameSamples: 512,
      deviceRaw: '2',
      deviceParsed: 2,
    })
    expect(chunks.join('')).toContain('[2] USB Mic')
  })

  it('notes missing device index', () => {
    devicesRef.current = [
      { index: 0, name: 'Only', isDefault: true, defaultSampleRate: 44100 },
    ]
    const chunks: string[] = []
    const out = {
      write: (s: string) => chunks.push(s),
    } as NodeJS.WritableStream
    writeVerboseStartup(out, {
      args: baseArgs(),
      displayStyle: 'standard',
      isTTY: false,
      stdoutTTY: false,
      instrumentId: 'guitar',
      instrumentName: 'Guitar',
      tuningId: 'guitar-standard',
      tuningName: 'Standard',
      audioFrameSamples: 512,
      deviceRaw: '9',
      deviceParsed: 9,
    })
    expect(chunks.join('')).toContain('no device at this index')
  })

  it('resolves a unique substring device name', () => {
    devicesRef.current = [
      {
        index: 1,
        name: 'Blue Yeti Analog',
        isDefault: false,
        defaultSampleRate: 48000,
      },
      {
        index: 2,
        name: 'HD Webcam',
        isDefault: false,
        defaultSampleRate: 16000,
      },
    ]
    const chunks: string[] = []
    const out = {
      write: (s: string) => chunks.push(s),
    } as NodeJS.WritableStream
    writeVerboseStartup(out, {
      args: baseArgs(),
      displayStyle: 'standard',
      isTTY: false,
      stdoutTTY: false,
      instrumentId: 'guitar',
      instrumentName: 'Guitar',
      tuningId: 'guitar-standard',
      tuningName: 'Standard',
      audioFrameSamples: 512,
      deviceRaw: 'Yeti',
      deviceParsed: 'yeti',
    })
    expect(chunks.join('')).toContain('Blue Yeti Analog')
  })

  it('warns when substring matches no device', () => {
    devicesRef.current = [
      { index: 0, name: 'Mic', isDefault: true, defaultSampleRate: 48000 },
    ]
    const chunks: string[] = []
    const out = {
      write: (s: string) => chunks.push(s),
    } as NodeJS.WritableStream
    writeVerboseStartup(out, {
      args: baseArgs(),
      displayStyle: 'standard',
      isTTY: false,
      stdoutTTY: false,
      instrumentId: 'guitar',
      instrumentName: 'Guitar',
      tuningId: 'guitar-standard',
      tuningName: 'Standard',
      audioFrameSamples: 512,
      deviceRaw: 'zzz',
      deviceParsed: 'zzz',
    })
    expect(chunks.join('')).toContain('no substring match')
  })

  it('warns when substring is ambiguous', () => {
    devicesRef.current = [
      {
        index: 0,
        name: 'Mic Pro Left',
        isDefault: false,
        defaultSampleRate: 48000,
      },
      {
        index: 1,
        name: 'Mic Pro Right',
        isDefault: false,
        defaultSampleRate: 48000,
      },
    ]
    const chunks: string[] = []
    const out = {
      write: (s: string) => chunks.push(s),
    } as NodeJS.WritableStream
    writeVerboseStartup(out, {
      args: baseArgs(),
      displayStyle: 'standard',
      isTTY: false,
      stdoutTTY: false,
      instrumentId: 'guitar',
      instrumentName: 'Guitar',
      tuningId: 'guitar-standard',
      tuningName: 'Standard',
      audioFrameSamples: 512,
      deviceRaw: 'Pro',
      deviceParsed: 'pro',
    })
    expect(chunks.join('')).toContain('2 substring matches')
  })
})
