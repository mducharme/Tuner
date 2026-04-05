import readline from 'node:readline'

export type MenuKey =
  | { kind: 'up' }
  | { kind: 'down' }
  | { kind: 'left' }
  | { kind: 'right' }
  | { kind: 'enter' }
  | { kind: 'escape' }
  /** Printable ASCII (a-z), lowercase name */
  | { kind: 'letter'; ch: string }
  | { kind: 'ctrl-c' }

function isLetterChar(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
}

/**
 * Decode readline keypress; Windows/ConPTY often differs from macOS/Linux (name vs sequence).
 */
export function parseMenuKey(key: readline.Key | undefined): MenuKey | null {
  if (!key) return null

  const seq = key.sequence ?? ''

  // Ctrl+C sends ETX in raw mode (especially Windows); does not always set key.name === 'c'
  if (seq === '\u0003' || seq === '\x03') {
    return { kind: 'ctrl-c' }
  }
  if (key.ctrl && (key.name === 'c' || seq === '\u0003')) {
    return { kind: 'ctrl-c' }
  }

  if (key.name === 'up' || key.name === 'k') return { kind: 'up' }
  if (key.name === 'down' || key.name === 'j') return { kind: 'down' }
  if (key.name === 'left' || key.name === 'h') return { kind: 'left' }
  if (key.name === 'right' || key.name === 'l') return { kind: 'right' }
  if (key.name === 'return' || key.name === 'enter') return { kind: 'enter' }
  if (key.name === 'escape') return { kind: 'escape' }

  if (!key.ctrl && !key.meta) {
    const name = key.name ?? ''
    if (name.length === 1 && isLetterChar(name)) {
      return { kind: 'letter', ch: name.toLowerCase() }
    }
    if (seq.length === 1) {
      const ch0 = seq[0]
      if (ch0 !== undefined && isLetterChar(ch0)) {
        return { kind: 'letter', ch: ch0.toLowerCase() }
      }
    }
  }

  return null
}

export type KeypressUninstall = () => void

/**
 * Raw stdin + keypress events. Uninstall restores prior rawMode when possible.
 */
export function installKeypress(
  stdin: NodeJS.ReadStream & { isTTY?: boolean },
): {
  onKey: (fn: (key: MenuKey) => void) => void
  uninstall: KeypressUninstall
} {
  const listeners = new Set<(key: MenuKey) => void>()

  if (!stdin.isTTY) {
    return {
      onKey(fn): void {
        listeners.add(fn)
      },
      uninstall: () => {
        listeners.clear()
      },
    }
  }

  readline.emitKeypressEvents(stdin)
  stdin.setRawMode(true)
  stdin.resume()

  const handler = (_s: string | undefined, key: readline.Key): void => {
    const mk = parseMenuKey(key)
    if (!mk) return
    for (const fn of listeners) {
      fn(mk)
    }
  }

  stdin.on('keypress', handler)

  return {
    onKey(fn): void {
      listeners.add(fn)
    },
    uninstall(): void {
      stdin.off('keypress', handler)
      try {
        stdin.setRawMode(false)
      } catch {
        /* ignore */
      }
      listeners.clear()
    },
  }
}
