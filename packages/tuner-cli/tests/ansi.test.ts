import { describe, expect, it } from 'vitest'
import {
  formatMarkerCell,
  formatTrackCell,
  formatTrackShade,
  resolveColorMode,
  stripAnsi,
  styleCents,
  styleDim,
  styleGaugeMarker,
  styleInTune,
  styleNote,
} from '../src/ansi.js'

describe('stripAnsi', () => {
  it('removes SGR color sequences', () => {
    const s = `${String.fromCharCode(27)}[32mok${String.fromCharCode(27)}[0m`
    expect(stripAnsi(s)).toBe('ok')
  })

  it('leaves plain text unchanged', () => {
    expect(stripAnsi('hello')).toBe('hello')
  })
})

describe('resolveColorMode', () => {
  it('returns false for never', () => {
    expect(resolveColorMode('never', true, {})).toBe(false)
  })

  it('returns true for always', () => {
    expect(resolveColorMode('always', false, {})).toBe(true)
  })

  it('auto: returns false when NO_COLOR is set', () => {
    expect(resolveColorMode('auto', true, { NO_COLOR: '1' })).toBe(false)
  })

  it('auto: returns true when FORCE_COLOR is set', () => {
    expect(resolveColorMode('auto', false, { FORCE_COLOR: '1' })).toBe(true)
  })

  it('auto: follows isTTY when no env override', () => {
    expect(resolveColorMode('auto', true, {})).toBe(true)
    expect(resolveColorMode('auto', false, {})).toBe(false)
  })
})

describe('styleCents', () => {
  it('returns empty strings when color is off', () => {
    const s = styleCents(false, 10)
    expect(s.open).toBe('')
    expect(s.close).toBe('')
  })

  it('returns green SGR for |cents| ≤ 5', () => {
    const s = styleCents(true, 0)
    expect(s.open).toContain('\x1b[')
    expect(s.open).toContain('32') // green
  })

  it('returns yellow SGR for |cents| between 5 and 20', () => {
    const s = styleCents(true, 10)
    expect(s.open).toContain('33') // yellow
  })

  it('returns red SGR for |cents| > 20', () => {
    const s = styleCents(true, 30)
    expect(s.open).toContain('31') // red
  })
})

describe('styleNote / styleDim / styleInTune', () => {
  it('styleNote returns bold SGR when color is on', () => {
    expect(styleNote(true).open).toContain('\x1b[')
    expect(styleNote(false).open).toBe('')
  })

  it('styleDim returns dim SGR when color is on', () => {
    expect(styleDim(true).open).toContain('\x1b[')
    expect(styleDim(false).open).toBe('')
  })

  it('styleInTune returns green SGR when color is on', () => {
    expect(styleInTune(true).open).toContain('32')
    expect(styleInTune(false).open).toBe('')
  })
})

describe('styleGaugeMarker', () => {
  it('returns green when stringInTune is true', () => {
    expect(styleGaugeMarker(true, 30, true).open).toContain('32')
  })

  it('delegates to styleCents when not in tune', () => {
    expect(styleGaugeMarker(true, 30, false).open).toContain('31') // red
  })
})

describe('formatTrackCell', () => {
  it('returns dot without color', () => {
    expect(formatTrackCell(false, 0, 5)).toBe('·')
  })

  it('returns cyan-tinted dot for cells left of center', () => {
    expect(formatTrackCell(true, 2, 5)).toContain('36') // cyan
  })

  it('returns magenta-tinted dot for cells right of center', () => {
    expect(formatTrackCell(true, 8, 5)).toContain('35') // magenta
  })

  it('returns white-tinted dot for the center cell', () => {
    expect(formatTrackCell(true, 5, 5)).toContain('37') // white
  })
})

describe('formatTrackShade', () => {
  it('returns char unchanged without color', () => {
    expect(formatTrackShade(false, 0, 5, '░')).toBe('░')
  })

  it('returns cyan-tinted shade for cells left of center', () => {
    expect(formatTrackShade(true, 2, 5, '░')).toContain('36')
  })

  it('returns magenta-tinted shade for cells right of center', () => {
    expect(formatTrackShade(true, 8, 5, '░')).toContain('35')
  })

  it('returns white-tinted shade for the center cell', () => {
    expect(formatTrackShade(true, 5, 5, '░')).toContain('37')
  })
})

describe('formatMarkerCell', () => {
  it('returns block char without color', () => {
    expect(formatMarkerCell(false, '', '')).toBe('█')
  })

  it('wraps block char with open/close when color is on', () => {
    expect(formatMarkerCell(true, '\x1b[32m', '\x1b[0m')).toBe(
      '\x1b[32m\x1b[1m█\x1b[0m',
    )
  })
})
