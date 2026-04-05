import type { TunerResult } from 'tuner-core'
import { describe, expect, it } from 'vitest'
import { stripAnsi } from '../src/ansi.js'
import {
  COLOR_BAR_SLOTS,
  FANCY_BAR_SLOTS,
  buildFancyGaugeBar,
  buildGaugeBar,
  fitOneTTYLine,
  formatInfoLine,
} from '../src/format-line.js'

// ─── buildGaugeBar ────────────────────────────────────────────────────────────

describe('buildGaugeBar', () => {
  it('produces exactly barLen characters without color', () => {
    expect([...buildGaugeBar(0, 11, false, false)]).toHaveLength(11)
    expect([...buildGaugeBar(0, COLOR_BAR_SLOTS, false, false)]).toHaveLength(
      COLOR_BAR_SLOTS,
    )
  })

  it('places marker at first position when cents = −50', () => {
    const bar = buildGaugeBar(-50, 11, false, false)
    expect(bar[0]).toBe('█')
    expect(bar.replaceAll('█', '')).toBe('··········')
  })

  it('places marker at last position when cents = +50', () => {
    const bar = buildGaugeBar(50, 11, false, false)
    expect(bar[10]).toBe('█')
    expect(bar.replaceAll('█', '')).toBe('··········')
  })

  it('places marker at center for 0 cents with odd barLen', () => {
    const barLen = 11
    const bar = buildGaugeBar(0, barLen, false, false)
    const mid = (barLen - 1) / 2
    expect(bar[mid]).toBe('█')
  })

  it('clamps cents below −50 to −50', () => {
    expect(buildGaugeBar(-999, 11, false, false)).toBe(
      buildGaugeBar(-50, 11, false, false),
    )
  })

  it('clamps cents above +50 to +50', () => {
    expect(buildGaugeBar(999, 11, false, false)).toBe(
      buildGaugeBar(50, 11, false, false),
    )
  })

  it('contains ANSI codes when color = true', () => {
    const bar = buildGaugeBar(0, 11, true, false)
    expect(stripAnsi(bar)).not.toBe(bar)
  })
})

// ─── buildFancyGaugeBar ───────────────────────────────────────────────────────

describe('buildFancyGaugeBar', () => {
  it('produces exactly barLen visible characters without color', () => {
    const bar = buildFancyGaugeBar(0, FANCY_BAR_SLOTS, false, false)
    // Each char in the bar is a single BMP Unicode code point
    expect([...bar]).toHaveLength(FANCY_BAR_SLOTS)
  })

  it('contains only shade/marker characters without color', () => {
    const bar = buildFancyGaugeBar(0, 17, false, false)
    expect(bar).toMatch(/^[░▒▓█]+$/)
  })

  it('places marker █ at first cell when cents aligns with it', () => {
    // cellCenter(0) = 0.5/barLen; pos = (cents+50)/100
    // dist = |cellCenter - pos| * barLen < 0.2  →  pos ≈ 0.5/barLen
    // cents = pos*100 - 50 ≈ 50/barLen - 50
    const barLen = 17
    const centsForCell0 = (0.5 / barLen) * 100 - 50 // ≈ −47.06
    const bar = buildFancyGaugeBar(centsForCell0, barLen, false, false)
    expect(bar[0]).toBe('█')
  })

  it('contains ANSI codes when color = true', () => {
    const bar = buildFancyGaugeBar(0, FANCY_BAR_SLOTS, true, false)
    expect(stripAnsi(bar)).not.toBe(bar)
  })

  it('uses mid shade glyphs (▒) for some needle positions', () => {
    let found = false
    for (let cents = -50; cents <= 50 && !found; cents += 1) {
      const bar = buildFancyGaugeBar(cents, 17, false, false)
      if (bar.includes('▒')) found = true
    }
    expect(found).toBe(true)
  })
})

// ─── formatInfoLine ───────────────────────────────────────────────────────────

const baseResult: TunerResult = {
  frequency: 440,
  note: 'A',
  octave: 4,
  cents: 0,
  closestString: null,
  tuningStrings: null,
}

describe('formatInfoLine', () => {
  it('includes note, octave, Hz, and cents without color', () => {
    const line = formatInfoLine(baseResult, false)
    expect(line).toContain('A4')
    expect(line).toContain('440.0 Hz')
    expect(line).toContain('¢')
  })

  it('does not contain ANSI codes without color', () => {
    const line = formatInfoLine(baseResult, false)
    expect(stripAnsi(line)).toBe(line)
  })

  it('contains ANSI codes with color', () => {
    const line = formatInfoLine(baseResult, true)
    expect(stripAnsi(line)).not.toBe(line)
  })

  it('includes closest string name and cents offset when present', () => {
    const result: TunerResult = {
      ...baseResult,
      closestString: {
        name: 'E2',
        targetFrequency: 82.41,
        centsOff: -3,
        inTune: false,
      },
    }
    const line = formatInfoLine(result, false)
    expect(line).toContain('│')
    expect(line).toContain('E2')
    expect(line).toContain('-3')
  })

  it('shows in-tune checkmark when string is in tune', () => {
    const result: TunerResult = {
      ...baseResult,
      closestString: {
        name: 'A2',
        targetFrequency: 110,
        centsOff: 0,
        inTune: true,
      },
    }
    const line = formatInfoLine(result, false)
    expect(line).toContain('✓')
  })

  it('omits string section when closestString is null', () => {
    const line = formatInfoLine(baseResult, false)
    expect(line).not.toContain('│')
  })
})

// ─── fitOneTTYLine ────────────────────────────────────────────────────────────

describe('fitOneTTYLine', () => {
  it('returns line unchanged when it fits within maxCols', () => {
    expect(fitOneTTYLine('hello', 10)).toBe('hello')
  })

  it('returns line unchanged when exactly maxCols long', () => {
    expect(fitOneTTYLine('hello', 5)).toBe('hello')
  })

  it('truncates with ellipsis when plain text exceeds maxCols', () => {
    expect(fitOneTTYLine('hello world', 5)).toBe('hell…')
  })

  it('measures plain length (not ANSI-escaped length) when deciding to truncate', () => {
    // Plain text is 5 chars; ANSI sequences are ignored when measuring
    const ansiLine = '\x1b[32mhello\x1b[0m'
    expect(fitOneTTYLine(ansiLine, 10)).toBe(ansiLine)
  })

  it('strips ANSI when truncating', () => {
    // Plain "hello world" = 11 chars; truncated to 5 → "hell…"
    const ansiLine = '\x1b[32mhello world\x1b[0m'
    expect(fitOneTTYLine(ansiLine, 5)).toBe('hell…')
  })
})
