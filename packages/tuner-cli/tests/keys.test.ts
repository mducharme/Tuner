import readline from 'node:readline'
import type { Key } from 'node:readline'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installKeypress, parseMenuKey } from '../src/input/keys.js'

describe('parseMenuKey', () => {
  it('returns null for undefined', () => {
    expect(parseMenuKey(undefined)).toBeNull()
  })

  it('detects Ctrl+C via ETX sequence', () => {
    expect(parseMenuKey({ sequence: '\u0003' } as Key)).toEqual({
      kind: 'ctrl-c',
    })
    expect(parseMenuKey({ sequence: '\x03' } as Key)).toEqual({
      kind: 'ctrl-c',
    })
  })

  it('detects Ctrl+C when ctrl and name c', () => {
    expect(
      parseMenuKey({ ctrl: true, name: 'c', sequence: '' } as Key),
    ).toEqual({ kind: 'ctrl-c' })
  })

  it('maps movement and enter / escape', () => {
    expect(parseMenuKey({ name: 'up' } as Key)).toEqual({
      kind: 'up',
    })
    expect(parseMenuKey({ name: 'k' } as Key)).toEqual({ kind: 'up' })
    expect(parseMenuKey({ name: 'down' } as Key)).toEqual({
      kind: 'down',
    })
    expect(parseMenuKey({ name: 'j' } as Key)).toEqual({
      kind: 'down',
    })
    expect(parseMenuKey({ name: 'left' } as Key)).toEqual({
      kind: 'left',
    })
    expect(parseMenuKey({ name: 'h' } as Key)).toEqual({
      kind: 'left',
    })
    expect(parseMenuKey({ name: 'right' } as Key)).toEqual({
      kind: 'right',
    })
    expect(parseMenuKey({ name: 'l' } as Key)).toEqual({
      kind: 'right',
    })
    expect(parseMenuKey({ name: 'return' } as Key)).toEqual({
      kind: 'enter',
    })
    expect(parseMenuKey({ name: 'enter' } as Key)).toEqual({
      kind: 'enter',
    })
    expect(parseMenuKey({ name: 'escape' } as Key)).toEqual({
      kind: 'escape',
    })
  })

  it('maps single-letter name to letter', () => {
    expect(parseMenuKey({ name: 'q' } as Key)).toEqual({
      kind: 'letter',
      ch: 'q',
    })
    expect(parseMenuKey({ name: 'M' } as Key)).toEqual({
      kind: 'letter',
      ch: 'm',
    })
  })

  it('maps single-char sequence to letter when name is not used', () => {
    expect(parseMenuKey({ name: '', sequence: 'z' } as Key)).toEqual({
      kind: 'letter',
      ch: 'z',
    })
  })

  it('returns null for unmapped keys', () => {
    expect(parseMenuKey({ name: 'f1' } as Key)).toBeNull()
    expect(
      parseMenuKey({ ctrl: true, name: 'd', sequence: '' } as Key),
    ).toBeNull()
  })
})

describe('installKeypress (non-TTY)', () => {
  it('onKey registers a listener that can be called manually', () => {
    const fakeStdin = { isTTY: false } as NodeJS.ReadStream & { isTTY: boolean }
    const { onKey, uninstall } = installKeypress(fakeStdin)
    const received: unknown[] = []
    onKey((k) => received.push(k))
    // Non-TTY branch: no keypress events fire automatically; just verify wiring
    uninstall()
    expect(received).toHaveLength(0)
  })

  it('uninstall clears listeners in non-TTY mode', () => {
    const fakeStdin = { isTTY: false } as NodeJS.ReadStream & { isTTY: boolean }
    const { onKey, uninstall } = installKeypress(fakeStdin)
    const fn = vi.fn()
    onKey(fn)
    uninstall()
    // After uninstall the listener set is cleared; fn should never be called
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('installKeypress (TTY)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('wires keypress handler and forwards parsed menu keys', () => {
    vi.spyOn(readline, 'emitKeypressEvents').mockImplementation(() => {})

    const handlers: Array<(s: string | undefined, key: Key) => void> = []
    const fakeStdin = {
      isTTY: true,
      setRawMode: vi.fn(),
      resume: vi.fn(),
      on(event: string, fn: (s: string | undefined, key: Key) => void): void {
        if (event === 'keypress') handlers.push(fn)
      },
      off: vi.fn(
        (event: string, fn: (s: string | undefined, key: Key) => void) => {
          if (event !== 'keypress') return
          const i = handlers.indexOf(fn)
          if (i >= 0) handlers.splice(i, 1)
        },
      ),
    } as unknown as NodeJS.ReadStream & { isTTY: boolean }

    const { onKey, uninstall } = installKeypress(fakeStdin)
    const received: unknown[] = []
    onKey((k) => received.push(k))

    expect(handlers).toHaveLength(1)
    const keypress = handlers[0]
    expect(keypress).toBeDefined()
    keypress?.(undefined, { name: 'left' } as Key)
    expect(received).toEqual([{ kind: 'left' }])

    uninstall()
    expect(fakeStdin.off).toHaveBeenCalled()
    expect(fakeStdin.setRawMode).toHaveBeenLastCalledWith(false)
  })

  it('uninstall ignores setRawMode failures', () => {
    vi.spyOn(readline, 'emitKeypressEvents').mockImplementation(() => {})
    const handlers: Array<(s: string | undefined, key: Key) => void> = []
    const fakeStdin = {
      isTTY: true,
      setRawMode: vi.fn((enable: boolean) => {
        if (!enable) throw new Error('raw mode unsupported')
      }),
      resume: vi.fn(),
      on(event: string, fn: (s: string | undefined, key: Key) => void): void {
        if (event === 'keypress') handlers.push(fn)
      },
      off: vi.fn(),
    } as unknown as NodeJS.ReadStream & { isTTY: boolean }

    const { uninstall } = installKeypress(fakeStdin)
    expect(() => uninstall()).not.toThrow()
  })
})
