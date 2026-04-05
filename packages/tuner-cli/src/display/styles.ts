import type { TunerResult } from 'tuner-core'
import { type ColorChoice, resolveColorMode, stripAnsi } from '../ansi.js'
import {
  COLOR_BAR_SLOTS,
  FANCY_BAR_SLOTS,
  buildFancyGaugeBar,
  buildGaugeBar,
  fitOneTTYLine,
  formatInfoLine,
} from '../format-line.js'

export type DisplayStyle = 'standard' | 'colors' | 'ansi'

const STYLE_LABELS: Record<DisplayStyle, string> = {
  standard: 'Standard',
  colors: 'Colors',
  ansi: 'ANSI',
}

export function displayStyleLabel(style: DisplayStyle): string {
  return STYLE_LABELS[style]
}

export const DISPLAY_STYLES: DisplayStyle[] = ['standard', 'colors', 'ansi']

/**
 * Default when --style is omitted: ANSI if color mode would be on (rich escapes),
 * else Colors on a TTY (layout with optional color when --color allows), else Standard.
 */
export function defaultDisplayStyle(
  isTTY: boolean,
  env: NodeJS.ProcessEnv,
): DisplayStyle {
  if (isTTY && resolveColorMode('auto', isTTY, env)) return 'ansi'
  if (isTTY) return 'colors'
  return 'standard'
}

export type RenderContext = {
  style: DisplayStyle
  colorChoice: ColorChoice
  termWidth: number
  isTTY: boolean
  env: NodeJS.ProcessEnv
}

function effectiveColor(ctx: RenderContext): boolean {
  if (ctx.style === 'standard') return false
  return resolveColorMode(ctx.colorChoice, ctx.isTTY, ctx.env)
}

/** One physical line: info + bar; no wrap past terminal width. */
export function renderTunerLine(
  result: TunerResult,
  ctx: RenderContext,
): string {
  const cols = Math.max(20, ctx.termWidth)
  const color = effectiveColor(ctx)

  if (ctx.style === 'ansi') {
    const bar = buildFancyGaugeBar(
      result.cents,
      FANCY_BAR_SLOTS,
      color,
      result.closestString?.inTune ?? false,
    )
    const line = `${formatInfoLine(result, color)}  ${bar}`
    return fitOneTTYLine(line, cols)
  }

  const bar = buildGaugeBar(
    result.cents,
    COLOR_BAR_SLOTS,
    color,
    result.closestString?.inTune ?? false,
  )
  const line = `${formatInfoLine(result, color)}  ${bar}`
  return fitOneTTYLine(line, cols)
}
