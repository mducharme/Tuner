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
