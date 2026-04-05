import type { TunerResult } from 'tuner-core'
import {
  formatMarkerCell,
  formatTrackCell,
  formatTrackShade,
  stripAnsi,
  styleCents,
  styleDim,
  styleGaugeMarker,
  styleInTune,
  styleNote,
} from './ansi.js'

export const COLOR_BAR_SLOTS = 17
export const FANCY_BAR_SLOTS = 28

const SHADE_LIGHT = '░'
const SHADE_MID = '▒'
const SHADE_HEAVY = '▓'

function clampCents(cents: number): number {
  return Math.max(-50, Math.min(50, cents))
}

function centsToMarkerIndex(cents: number, barLen: number): number {
  const c = clampCents(cents)
  const t = (c + 50) / 100
  return Math.round(t * (barLen - 1))
}

export function buildGaugeBar(
  cents: number,
  barLen: number,
  color: boolean,
  stringInTune: boolean,
): string {
  const c = clampCents(cents)
  const markerIdx = centsToMarkerIndex(c, barLen)
  const centerIdx = (barLen - 1) / 2

  const mk = styleGaugeMarker(color, c, stringInTune)
  let s = ''
  for (let i = 0; i < barLen; i++) {
    if (i === markerIdx) {
      s += formatMarkerCell(color, mk.open, mk.close)
    } else {
      s += formatTrackCell(color, i, centerIdx)
    }
  }
  return s
}

/**
 * Finer cents resolution: shade falloff around needle; tinted track when color is on.
 */
export function buildFancyGaugeBar(
  cents: number,
  barLen: number,
  color: boolean,
  stringInTune: boolean,
): string {
  const c = clampCents(cents)
  const pos = (c + 50) / 100
  const centerIdx = (barLen - 1) / 2
  const mk = styleGaugeMarker(color, c, stringInTune)

  let s = ''
  for (let i = 0; i < barLen; i++) {
    const cellCenter = (i + 0.5) / barLen
    const dist = Math.abs(cellCenter - pos) * barLen
    let ch: string
    if (dist < 0.2) {
      s += formatMarkerCell(color, mk.open, mk.close)
      continue
    }
    if (dist < 0.55) {
      ch = SHADE_HEAVY
    } else if (dist < 1.0) {
      ch = SHADE_MID
    } else {
      ch = SHADE_LIGHT
    }

    if (!color) {
      s += ch
      continue
    }

    if (dist < 1.0) {
      const tint = styleGaugeMarker(color, c, stringInTune)
      s += `${tint.open}${ch}${tint.close}`
    } else {
      s += formatTrackShade(color, i, centerIdx, ch)
    }
  }
  return s
}

/** Fixed width so the following gauge column does not drift (−50…+50, one decimal). */
const CHROMATIC_CENTS_FIELD = 6
/** e.g. 1234.5 Hz — pad so bar starts at same column. */
const HZ_FIELD = 8
/** String-target cents (integer), signed; keeps │ block width stable. */
const STRING_CENTS_OFF_FIELD = 5

function formatSignedOneDecimal(value: number, fieldWidth: number): string {
  const sign = value >= 0 ? '+' : '-'
  const abs = Math.abs(value).toFixed(1)
  return `${sign}${abs}`.padStart(fieldWidth, ' ')
}

function formatHzField(hz: number): string {
  return `${hz.toFixed(1).padStart(HZ_FIELD, ' ')} Hz`
}

function formatStringCentsOff(off: number): string {
  const s = off >= 0 ? `+${off.toFixed(0)}` : off.toFixed(0)
  return s.padStart(STRING_CENTS_OFF_FIELD, ' ')
}

/** Info field: note, Hz, cents, optional string row (shared by all styles). */
export function formatInfoLine(result: TunerResult, color: boolean): string {
  const centsStr = formatSignedOneDecimal(result.cents, CHROMATIC_CENTS_FIELD)
  const n = styleNote(color)
  const dim = styleDim(color)
  const ct = styleCents(color, result.cents)

  let line =
    `${n.open}${result.note}${result.octave}${n.close}` +
    `  ${dim.open}${formatHzField(result.frequency)}${dim.close}` +
    `  ${ct.open}${centsStr}¢${ct.close}`

  const cs = result.closestString
  if (cs) {
    const off = formatStringCentsOff(cs.centsOff)
    const ok = styleInTune(color)
    const mark = cs.inTune ? `${ok.open} ✓${ok.close}` : ''
    line += `  │ ${cs.name} ${off}¢${mark}`
  }

  return line
}

export function fitOneTTYLine(ansiLine: string, maxCols: number): string {
  const plain = stripAnsi(ansiLine)
  if (plain.length <= maxCols) return ansiLine
  const ell = '…'
  const cut = Math.max(1, maxCols - ell.length)
  return plain.slice(0, cut) + ell
}
