/** Minimal ANSI SGR helpers; gated by {@link resolveColorMode}. */

export type ColorChoice = 'auto' | 'always' | 'never'

export function resolveColorMode(
  choice: ColorChoice,
  isTTY: boolean,
  env: NodeJS.ProcessEnv,
): boolean {
  if (choice === 'never') return false
  if (choice === 'always') return true
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return false
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '0') return true
  return isTTY
}

const SGR = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
} as const

/** Match ANSI SGR sequences (CSI … m). Built without `\x1b` in the pattern for tooling rules. */
const ANSI_SGR_PATTERN = new RegExp(
  `${String.fromCharCode(27)}\\[[0-9;]*m`,
  'g',
)

export function stripAnsi(s: string): string {
  return s.replace(ANSI_SGR_PATTERN, '')
}

/** Chromatic cents: green near 0, yellow mid, red far. */
export function styleCents(
  color: boolean,
  cents: number,
): { open: string; close: string } {
  if (!color) return { open: '', close: '' }
  const a = Math.abs(cents)
  if (a <= 5) return { open: SGR.green, close: SGR.reset }
  if (a <= 20) return { open: SGR.yellow, close: SGR.reset }
  return { open: SGR.red, close: SGR.reset }
}

export function styleNote(color: boolean): { open: string; close: string } {
  if (!color) return { open: '', close: '' }
  return { open: SGR.bold, close: SGR.reset }
}

export function styleDim(color: boolean): { open: string; close: string } {
  if (!color) return { open: '', close: '' }
  return { open: SGR.dim, close: SGR.reset }
}

export function styleInTune(color: boolean): { open: string; close: string } {
  if (!color) return { open: '', close: '' }
  return { open: SGR.green, close: SGR.reset }
}

/** Marker on gauge: green when string is in tune; else cents-based. */
export function styleGaugeMarker(
  color: boolean,
  cents: number,
  stringInTune: boolean,
): { open: string; close: string } {
  if (!color) return { open: '', close: '' }
  if (stringInTune) return { open: SGR.green, close: SGR.reset }
  return styleCents(color, cents)
}

/** One inactive track cell: slight flat / sharp tint by side of center. */
export function formatTrackCell(
  color: boolean,
  idx: number,
  centerIdx: number,
): string {
  if (!color) return '·'
  if (idx < centerIdx) {
    return `${SGR.dim}${SGR.cyan}·${SGR.reset}`
  }
  if (idx > centerIdx) {
    return `${SGR.dim}${SGR.magenta}·${SGR.reset}`
  }
  return `${SGR.dim}${SGR.white}·${SGR.reset}`
}

export function formatMarkerCell(
  color: boolean,
  open: string,
  close: string,
): string {
  if (!color) return '█'
  return `${open}${SGR.bold}█${close}`
}

/** Tinted track cell using shade blocks (fancy bar). */
export function formatTrackShade(
  color: boolean,
  idx: number,
  centerIdx: number,
  ch: string,
): string {
  if (!color) return ch
  if (idx < centerIdx) {
    return `${SGR.dim}${SGR.cyan}${ch}${SGR.reset}`
  }
  if (idx > centerIdx) {
    return `${SGR.dim}${SGR.magenta}${ch}${SGR.reset}`
  }
  return `${SGR.dim}${SGR.white}${ch}${SGR.reset}`
}
