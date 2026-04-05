import process from 'node:process'
import Decibri from 'decibri'
import { resolveColorMode } from './ansi.js'
import { type DisplayStyle, displayStyleLabel } from './display/styles.js'
import type { RunCliArgs } from './parsed-cli.js'

function describeInputDevice(
  raw: string | undefined,
  parsed: number | string | undefined,
): string {
  const devices = Decibri.devices()
  if (devices.length === 0) return '(no input devices reported)'

  if (parsed === undefined) {
    const d = devices.find((x) => x.isDefault) ?? devices[0]
    return d ? `[${d.index}] ${d.name} (host default)` : '(none)'
  }

  if (typeof parsed === 'number') {
    const d = devices.find((x) => x.index === parsed)
    return d
      ? `[${d.index}] ${d.name}`
      : `[${parsed}] (no device at this index)`
  }

  const lower = parsed.toLowerCase()
  const matches = devices.filter((d) => d.name.toLowerCase().includes(lower))
  if (matches.length === 1) {
    const d = matches[0]
    return d ? `"${raw}" → [${d.index}] ${d.name}` : String(raw)
  }
  if (matches.length === 0) {
    return `"${raw}" (no substring match — open may fail)`
  }
  return `"${raw}" (${matches.length} substring matches — open may fail)`
}

export function writeVerboseStartup(
  out: NodeJS.WritableStream,
  opts: {
    args: RunCliArgs
    displayStyle: DisplayStyle
    isTTY: boolean
    stdoutTTY: boolean
    instrumentId: string
    instrumentName: string
    tuningId: string
    tuningName: string
    audioFrameSamples: number
    deviceRaw: string | undefined
    deviceParsed: number | string | undefined
    /** Separate from startup print (e.g. after changing options in a TTY menu). */
    afterChange?: boolean
  },
): void {
  const { args } = opts
  const colorOn = resolveColorMode(args.color, opts.stdoutTTY, process.env)
  if (opts.afterChange) {
    out.write('\n')
  }
  const title = opts.afterChange
    ? 'tuner: configuration (updated)'
    : 'tuner: configuration'
  const lines = [
    title,
    `  instrument:      ${opts.instrumentName} (${opts.instrumentId})`,
    `  tuning:          ${opts.tuningName} (${opts.tuningId})`,
    `  detector:        ${args.detector}`,
    `  sample rate:     ${args.rate} Hz`,
    `  frame samples:   ${opts.audioFrameSamples}`,
    `  device:          ${opts.deviceRaw ?? '(default)'} — ${describeInputDevice(opts.deviceRaw, opts.deviceParsed)}`,
    `  cents threshold: ${args.centsThreshold}`,
    `  color:           ${args.color} (SGR ${colorOn ? 'on' : 'off'})`,
    `  display style:   ${displayStyleLabel(opts.displayStyle)} (${opts.displayStyle})`,
    `  stdin/stdout TTY: ${opts.isTTY}`,
  ]
  for (const line of lines) {
    out.write(`${line}\n`)
  }
}
