import type { TunerResult } from 'tuner-core'
import { describe, expect, it } from 'vitest'
import { stripAnsi } from '../src/ansi.js'
import {
  DISPLAY_STYLES,
  defaultDisplayStyle,
  displayStyleLabel,
  renderTunerLine,
} from '../src/display/styles.js'

const baseResult: TunerResult = {
  frequency: 440,
  note: 'A',
  octave: 4,
  cents: 2,
  closestString: null,
  tuningStrings: null,
}

describe('displayStyleLabel', () => {
  it('maps each display style to a short label', () => {
    expect(DISPLAY_STYLES).toEqual(['standard', 'colors', 'ansi'])
    for (const style of DISPLAY_STYLES) {
      expect(displayStyleLabel(style).length).toBeGreaterThan(0)
    }
  })
})

describe('defaultDisplayStyle', () => {
  it('prefers ansi on a TTY when auto color resolves on', () => {
    expect(defaultDisplayStyle(true, {})).toBe('ansi')
  })

  it('uses colors on a TTY when auto color is suppressed (e.g. NO_COLOR)', () => {
    expect(defaultDisplayStyle(true, { NO_COLOR: '1' })).toBe('colors')
  })

  it('uses standard when not a TTY', () => {
    expect(defaultDisplayStyle(false, {})).toBe('standard')
  })
})

describe('renderTunerLine', () => {
  it('renders standard track style without ansi when style is standard', () => {
    const line = renderTunerLine(baseResult, {
      style: 'standard',
      colorChoice: 'never',
      termWidth: 100,
      isTTY: false,
      env: {},
    })
    expect(line).toContain('A4')
    expect(stripAnsi(line)).toBe(line)
  })

  it('uses fancy bar path for ansi style', () => {
    const line = renderTunerLine(baseResult, {
      style: 'ansi',
      colorChoice: 'never',
      termWidth: 120,
      isTTY: true,
      env: {},
    })
    expect(line).toContain('A4')
    expect([...line]).toContain('█')
  })

  it('uses colors path (non-ansi) when style is colors', () => {
    const line = renderTunerLine(baseResult, {
      style: 'colors',
      colorChoice: 'never',
      termWidth: 120,
      isTTY: true,
      env: {},
    })
    expect(line).toContain('A4')
    expect(stripAnsi(line)).toBe(line)
  })
})
