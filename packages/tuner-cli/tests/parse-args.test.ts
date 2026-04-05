import { describe, expect, it } from 'vitest'
import { parseArgs, parseDeviceArg } from '../src/parse-args.js'

const node = (args: string[]) => ['node', 'tuner', ...args]

describe('parseArgs', () => {
  it('applies defaults', () => {
    const a = parseArgs(node([]))
    expect(a.help).toBe(false)
    expect(a.verbose).toBe(false)
    expect(a.rate).toBe(48000)
    expect(a.instrumentId).toBe('guitar')
    expect(a.tuningId).toBe('guitar-standard')
    expect(a.detector).toBe('yin')
    expect(a.centsThreshold).toBe(5)
    expect(a.color).toBe('auto')
    expect(a.style).toBeUndefined()
    expect(a.tuningExplicit).toBe(false)
    expect(a.listInstruments).toBe(false)
    expect(a.listTuningsFor).toBeUndefined()
  })

  it('defaults tuning to first list entry when only --instrument is set', () => {
    const a = parseArgs(node(['--instrument', 'bass']))
    expect(a.instrumentId).toBe('bass')
    expect(a.tuningExplicit).toBe(false)
    expect(a.tuningId).toBe('bass-standard-4')
  })

  it('parses flags and options', () => {
    const a = parseArgs(
      node([
        '--rate',
        '44100',
        '--instrument',
        'bass',
        '--tuning',
        'bass-standard',
        '--detector',
        'mpm',
        '--cents-threshold',
        '3',
        '--color',
        'never',
        '--style',
        'ansi',
        '--device',
        '2',
      ]),
    )
    expect(a.rate).toBe(44100)
    expect(a.instrumentId).toBe('bass')
    expect(a.tuningId).toBe('bass-standard')
    expect(a.detector).toBe('mpm')
    expect(a.centsThreshold).toBe(3)
    expect(a.color).toBe('never')
    expect(a.style).toBe('ansi')
    expect(a.device).toBe('2')
    expect(a.tuningExplicit).toBe(true)
  })

  it('sets help flags', () => {
    expect(parseArgs(node(['-h'])).help).toBe(true)
    expect(parseArgs(node(['--help'])).help).toBe(true)
    expect(parseArgs(node(['--list-devices'])).listDevices).toBe(true)
  })

  it('sets list-instruments and list-tunings', () => {
    expect(parseArgs(node(['--list-instruments'])).listInstruments).toBe(true)
    expect(parseArgs(node(['--list-tunings', 'banjo'])).listTuningsFor).toBe(
      'banjo',
    )
  })

  it('rejects --list-tunings without instrument id', () => {
    expect(() => parseArgs(node(['--list-tunings']))).toThrow(
      'requires an instrument id',
    )
  })

  it('sets verbose flags', () => {
    expect(parseArgs(node(['-v'])).verbose).toBe(true)
    expect(parseArgs(node(['--verbose'])).verbose).toBe(true)
  })

  it('rejects unknown argument', () => {
    expect(() => parseArgs(node(['--wat']))).toThrow('Unknown argument')
  })

  it('rejects invalid detector', () => {
    expect(() => parseArgs(node(['--detector', 'fft']))).toThrow(
      'must be one of',
    )
  })

  it('rejects invalid rate', () => {
    expect(() => parseArgs(node(['--rate', '500']))).toThrow('Invalid --rate')
  })
})

describe('parseDeviceArg', () => {
  it('returns integer when argv is numeric index string', () => {
    expect(parseDeviceArg('0')).toBe(0)
    expect(parseDeviceArg('12')).toBe(12)
  })

  it('returns string for device name', () => {
    expect(parseDeviceArg('Mic')).toBe('Mic')
  })

  it('returns undefined for undefined', () => {
    expect(parseDeviceArg(undefined)).toBeUndefined()
  })
})
