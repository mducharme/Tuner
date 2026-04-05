import { Command } from 'commander'
import { assert, describe, expect, it } from 'vitest'
import { parseCli, parseDeviceArg } from '../src/parse-args.js'

const node = (args: string[]) => ['node', 'tuner', ...args]

describe('parseCli', () => {
  it('applies defaults for a run command', () => {
    const p = parseCli(node([]))
    assert(p.kind === 'run')
    expect(p.args.verbose).toBe(false)
    expect(p.args.rate).toBe(48000)
    expect(p.args.instrumentId).toBe('guitar')
    expect(p.args.tuningId).toBe('guitar-standard')
    expect(p.args.detector).toBe('yin')
    expect(p.args.centsThreshold).toBe(5)
    expect(p.args.color).toBe('auto')
    expect(p.args.style).toBeUndefined()
    expect(p.args.tuningExplicit).toBe(false)
  })

  it('defaults tuning to first list entry when only --instrument is set', () => {
    const p = parseCli(node(['--instrument', 'bass']))
    assert(p.kind === 'run')
    expect(p.args.instrumentId).toBe('bass')
    expect(p.args.tuningExplicit).toBe(false)
    expect(p.args.tuningId).toBe('bass-standard-4')
  })

  it('parses flags and options', () => {
    const p = parseCli(
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
    assert(p.kind === 'run')
    expect(p.args.rate).toBe(44100)
    expect(p.args.instrumentId).toBe('bass')
    expect(p.args.tuningId).toBe('bass-standard')
    expect(p.args.detector).toBe('mpm')
    expect(p.args.centsThreshold).toBe(3)
    expect(p.args.color).toBe('never')
    expect(p.args.style).toBe('ansi')
    expect(p.args.device).toBe('2')
    expect(p.args.tuningExplicit).toBe(true)
  })

  it('returns help kind for -h / --help', () => {
    expect(parseCli(node(['-h'])).kind).toBe('help')
    expect(parseCli(node(['--help'])).kind).toBe('help')
  })

  it('returns list-devices kind', () => {
    expect(parseCli(node(['--list-devices'])).kind).toBe('list-devices')
  })

  it('returns list-instruments kind', () => {
    expect(parseCli(node(['--list-instruments'])).kind).toBe('list-instruments')
  })

  it('returns list-tunings kind with instrumentId', () => {
    const p = parseCli(node(['--list-tunings', 'banjo']))
    assert(p.kind === 'list-tunings')
    expect(p.instrumentId).toBe('banjo')
  })

  it('sets verbose', () => {
    const pShort = parseCli(node(['-v']))
    assert(pShort.kind === 'run')
    expect(pShort.args.verbose).toBe(true)

    const pLong = parseCli(node(['--verbose']))
    assert(pLong.kind === 'run')
    expect(pLong.args.verbose).toBe(true)
  })

  it('rejects --list-tunings without instrument id', () => {
    expect(() => parseCli(node(['--list-tunings']))).toThrow(
      'requires an instrument id',
    )
  })

  it('rejects unknown argument', () => {
    expect(() => parseCli(node(['--wat']))).toThrow('Unknown argument')
  })

  it('rejects invalid detector', () => {
    expect(() => parseCli(node(['--detector', 'fft']))).toThrow(
      'must be one of',
    )
  })

  it('rejects invalid rate', () => {
    expect(() => parseCli(node(['--rate', '500']))).toThrow('Invalid --rate')
  })

  it('rejects invalid --style', () => {
    expect(() => parseCli(node(['--style', 'fancy']))).toThrow(
      'must be standard, colors, or ansi',
    )
  })

  it('rejects invalid --cents-threshold', () => {
    expect(() => parseCli(node(['--cents-threshold', '-1']))).toThrow(
      'Invalid --cents-threshold',
    )
  })

  it('rejects --list-tunings when value looks like another flag', () => {
    expect(() => parseCli(node(['--list-tunings', '--instrument']))).toThrow(
      'requires an instrument id',
    )
  })

  it('rethrows non-Commander errors from Commander#parse', () => {
    const original = Command.prototype.parse
    Command.prototype.parse = function parse(): never {
      throw new Error('simulated parse failure')
    }
    try {
      expect(() => parseCli(['node', 'tuner'])).toThrow(
        'simulated parse failure',
      )
    } finally {
      Command.prototype.parse = original
    }
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
