import type { PitchDetectorKind } from 'tuner-core'
import type { ColorChoice } from './ansi.js'
import type { DisplayStyle } from './display/styles.js'

/** Session / tuner runtime options only (no list/help mode flags). */
export type RunCliArgs = {
  verbose: boolean
  device?: string
  rate: number
  instrumentId: string
  /** True when `--tuning` was passed on the command line. */
  tuningExplicit: boolean
  tuningId: string
  detector: PitchDetectorKind
  centsThreshold: number
  color: ColorChoice
  /** Set when `--style` is passed. */
  style?: DisplayStyle
}

export type ParsedCli =
  | { kind: 'help' }
  | { kind: 'list-devices' }
  | { kind: 'list-instruments' }
  | { kind: 'list-tunings'; instrumentId: string }
  | { kind: 'run'; args: RunCliArgs }

export type CliArgs = RunCliArgs & {
  help: boolean
  listDevices: boolean
  listInstruments: boolean
  listTuningsFor?: string
}

export function parsedCliToCliArgs(parsed: ParsedCli): CliArgs {
  const base: CliArgs = {
    help: false,
    verbose: false,
    listDevices: false,
    listInstruments: false,
    rate: 48000,
    instrumentId: 'guitar',
    tuningExplicit: false,
    tuningId: 'guitar-standard',
    detector: 'yin',
    centsThreshold: 5,
    color: 'auto',
  }
  if (parsed.kind === 'help') {
    return { ...base, help: true }
  }
  if (parsed.kind === 'list-devices') {
    return { ...base, listDevices: true }
  }
  if (parsed.kind === 'list-instruments') {
    return { ...base, listInstruments: true }
  }
  if (parsed.kind === 'list-tunings') {
    return { ...base, listTuningsFor: parsed.instrumentId }
  }
  return {
    ...base,
    ...parsed.args,
    help: false,
    listDevices: false,
    listInstruments: false,
  }
}
