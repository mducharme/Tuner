import type readline from 'node:readline'
import { describe, expect, it } from 'vitest'
import { parseMenuKey } from '../src/input/keys.js'

describe('parseMenuKey', () => {
  it('returns null for undefined', () => {
    expect(parseMenuKey(undefined)).toBeNull()
  })

  it('detects Ctrl+C via ETX sequence', () => {
    expect(parseMenuKey({ sequence: '\u0003' } as readline.Key)).toEqual({
      kind: 'ctrl-c',
    })
    expect(parseMenuKey({ sequence: '\x03' } as readline.Key)).toEqual({
      kind: 'ctrl-c',
    })
  })

  it('detects Ctrl+C when ctrl and name c', () => {
    expect(
      parseMenuKey({ ctrl: true, name: 'c', sequence: '' } as readline.Key),
    ).toEqual({ kind: 'ctrl-c' })
  })

  it('maps movement and enter / escape', () => {
    expect(parseMenuKey({ name: 'up' } as readline.Key)).toEqual({
      kind: 'up',
    })
    expect(parseMenuKey({ name: 'k' } as readline.Key)).toEqual({ kind: 'up' })
    expect(parseMenuKey({ name: 'down' } as readline.Key)).toEqual({
      kind: 'down',
    })
    expect(parseMenuKey({ name: 'j' } as readline.Key)).toEqual({
      kind: 'down',
    })
    expect(parseMenuKey({ name: 'left' } as readline.Key)).toEqual({
      kind: 'left',
    })
    expect(parseMenuKey({ name: 'h' } as readline.Key)).toEqual({
      kind: 'left',
    })
    expect(parseMenuKey({ name: 'right' } as readline.Key)).toEqual({
      kind: 'right',
    })
    expect(parseMenuKey({ name: 'l' } as readline.Key)).toEqual({
      kind: 'right',
    })
    expect(parseMenuKey({ name: 'return' } as readline.Key)).toEqual({
      kind: 'enter',
    })
    expect(parseMenuKey({ name: 'enter' } as readline.Key)).toEqual({
      kind: 'enter',
    })
    expect(parseMenuKey({ name: 'escape' } as readline.Key)).toEqual({
      kind: 'escape',
    })
  })

  it('maps single-letter name to letter', () => {
    expect(parseMenuKey({ name: 'q' } as readline.Key)).toEqual({
      kind: 'letter',
      ch: 'q',
    })
    expect(parseMenuKey({ name: 'M' } as readline.Key)).toEqual({
      kind: 'letter',
      ch: 'm',
    })
  })

  it('maps single-char sequence to letter when name is not used', () => {
    expect(parseMenuKey({ name: '', sequence: 'z' } as readline.Key)).toEqual({
      kind: 'letter',
      ch: 'z',
    })
  })

  it('returns null for unmapped keys', () => {
    expect(parseMenuKey({ name: 'f1' } as readline.Key)).toBeNull()
    expect(
      parseMenuKey({ ctrl: true, name: 'd', sequence: '' } as readline.Key),
    ).toBeNull()
  })
})
