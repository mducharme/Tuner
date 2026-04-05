import {
  Command,
  CommanderError,
  InvalidArgumentError,
  Option,
} from 'commander'
import { type PitchDetectorKind, findInstrument } from 'tuner-core'
import type { DisplayStyle } from './display/styles.js'
import { DISPLAY_STYLES } from './display/styles.js'
import {
  type CliArgs,
  type ParsedCli,
  type RunCliArgs,
  parsedCliToCliArgs,
} from './parsed-cli.js'

export type { CliArgs } from './parsed-cli.js'

export const CLI_DETECTORS: readonly PitchDetectorKind[] = [
  'pyin',
  'yin',
  'mpm',
  'autocorrelation',
]

const DISPLAY_STYLE_SET = new Set<string>(DISPLAY_STYLES)

export type CliOpts = {
  verbose: boolean
  listDevices: boolean
  listInstruments: boolean
  listTunings?: string
  device?: string
  rate: number
  instrument: string
  tuning?: string
  detector: PitchDetectorKind
  centsThreshold: number
  color: 'auto' | 'always' | 'never'
  style?: DisplayStyle
}

function helpTextAfter(): string {
  return `

TTY keys:
  i   Instrument list
  t   Tunings for current instrument
  s   Display style
  a   Advanced options (detector, device, rate, …)
  q   Quit when no menu is open (Esc too; inside lists Esc/← goes back — Advanced submenus return to Advanced)
  Lists: Enter or → pick · Esc or ← back · ↑/↓ or j/k move (h/l = ←/→)

Examples:
  tuner
  tuner --list-instruments
  tuner --list-tunings guitar
  tuner --style ansi --color always
  tuner --instrument bass --tuning bass-standard`
}

export function createCliCommand(): Command {
  return new Command('tuner')
    .description('tuner — chromatic tuner (CLI)')
    .addHelpText('after', helpTextAfter())
    .showHelpAfterError(false)
    .configureHelp({ sortOptions: true })
    .option(
      '-v, --verbose',
      'Print resolved options to stderr at startup',
      false,
    )
    .option(
      '--list-devices',
      'List audio input devices (decibri / PortAudio)',
      false,
    )
    .option(
      '--list-instruments',
      'List built-in instrument ids and names',
      false,
    )
    .addOption(
      new Option(
        '--list-tunings <id>',
        'List tuning ids and names for an instrument',
      ).argParser((v) => {
        if (!v || v.startsWith('--')) {
          throw new InvalidArgumentError(
            '--list-tunings requires an instrument id',
          )
        }
        return v
      }),
    )
    .option('--device <indexOrName>', 'Input device (substring match or index)')
    .addOption(
      new Option('--rate <hz>', 'Sample rate').default(48000).argParser((v) => {
        const n = Number(v)
        if (!Number.isFinite(n) || n < 1000) {
          throw new InvalidArgumentError(`Invalid --rate: ${v}`)
        }
        return n
      }),
    )
    .option('--instrument <id>', 'Instrument id', 'guitar')
    .option(
      '--tuning <id>',
      'Tuning id (default: first tuning for the instrument)',
    )
    .addOption(
      new Option('--detector <kind>', 'Pitch detector')
        .default('yin')
        .argParser((v) => {
          if (!CLI_DETECTORS.includes(v as PitchDetectorKind)) {
            throw new InvalidArgumentError(
              `--detector must be one of: ${CLI_DETECTORS.join(', ')}`,
            )
          }
          return v as PitchDetectorKind
        }),
    )
    .addOption(
      new Option('--cents-threshold <n>', 'In-tune cents for string hint')
        .default(5)
        .argParser((v) => {
          const n = Number(v)
          if (!Number.isFinite(n) || n < 0) {
            throw new InvalidArgumentError(`Invalid --cents-threshold: ${v}`)
          }
          return n
        }),
    )
    .addOption(
      new Option(
        '--color <mode>',
        'auto | always | never — SGR for colors & ansi',
      )
        .default('auto')
        .choices(['auto', 'always', 'never']),
    )
    .addOption(
      new Option('--style <name>', 'standard | colors | ansi').argParser(
        (v) => {
          if (!DISPLAY_STYLE_SET.has(v)) {
            throw new InvalidArgumentError(
              '--style must be standard, colors, or ansi',
            )
          }
          return v as DisplayStyle
        },
      ),
    )
}

export function mapCommanderError(e: CommanderError): Error {
  if (e.code === 'commander.unknownOption') {
    const m = /unknown option '([^']+)'/i.exec(e.message)
    if (m?.[1]) return new Error(`Unknown argument: ${m[1]}`)
  }
  if (
    (e.code === 'commander.optionMissingArgument' ||
      e.code === 'commander.missingArgument') &&
    e.message.includes('list-tunings')
  ) {
    return new Error('--list-tunings requires an instrument id')
  }
  return new Error(e.message)
}

export function parseDeviceArg(
  raw: string | undefined,
): number | string | undefined {
  if (raw === undefined) return undefined
  const asNum = Number(raw)
  if (Number.isInteger(asNum) && String(asNum) === raw) {
    return asNum
  }
  return raw
}

export function optsToParsed(raw: CliOpts): ParsedCli {
  if (raw.listDevices) return { kind: 'list-devices' }
  if (raw.listInstruments) return { kind: 'list-instruments' }
  if (raw.listTunings !== undefined && raw.listTunings !== '') {
    return { kind: 'list-tunings', instrumentId: raw.listTunings }
  }

  const tuningExplicit = raw.tuning !== undefined && raw.tuning !== ''
  let tuningId = raw.tuning ?? 'guitar-standard'
  if (!tuningExplicit) {
    const first = findInstrument(raw.instrument)?.tunings[0]?.id
    if (first) tuningId = first
  }

  const args: RunCliArgs = {
    verbose: Boolean(raw.verbose),
    rate: raw.rate,
    instrumentId: raw.instrument,
    tuningExplicit,
    tuningId,
    detector: raw.detector,
    centsThreshold: raw.centsThreshold,
    color: raw.color,
    ...(raw.device !== undefined ? { device: raw.device } : {}),
    ...(raw.style !== undefined ? { style: raw.style } : {}),
  }
  return { kind: 'run', args }
}

function parseWithCommander(
  argv: string[],
  configure: (cmd: Command) => void,
): ParsedCli {
  const cmd = createCliCommand()
  configure(cmd)
  try {
    cmd.parse(argv, RAN_FROM_NODE)
  } catch (e) {
    if (e instanceof CommanderError) {
      if (e.code === 'commander.helpDisplayed' || e.code === 'commander.help') {
        return { kind: 'help' }
      }
      throw mapCommanderError(e)
    }
    throw e
  }
  return optsToParsed(cmd.opts() as CliOpts)
}

const RAN_FROM_NODE = { from: 'node' as const }

function configureSilentCommander(cmd: Command): void {
  cmd.exitOverride()
  cmd.configureOutput({ writeOut: () => {}, writeErr: () => {} })
}

/**
 * Parse argv without writing to stdout/stderr (tests + `index.ts` share this).
 * Help is returned as `{ kind: 'help' }`; callers render help themselves.
 */
function parseCliArgv(argv: string[]): ParsedCli {
  return parseWithCommander(argv, configureSilentCommander)
}

/** Parse argv for tests: no output, help → ParsedCli without printing. */
export const parseCli = parseCliArgv

/**
 * Parse argv for the real process entry. Suppresses Commander's help/error
 * writes so the app prints help and errors exactly once (see `index.ts`).
 */
export const parseCliRuntime = parseCliArgv

export function parseArgs(argv: string[]): CliArgs {
  return parsedCliToCliArgs(parseCli(argv))
}
