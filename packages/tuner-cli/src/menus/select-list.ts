import type { MenuKey } from '../input/keys.js'

export type SelectListState<T> = {
  title: string
  items: readonly T[]
  /** Visible row text per item */
  label: (item: T, index: number) => string
  resolve: (result: number | null) => void
  selected: number
  firstDraw: boolean
  stdout: NodeJS.WriteStream
}

let active: SelectListState<unknown> | null = null

function menuLines<T>(s: SelectListState<T>): string[] {
  return [
    s.title,
    ...s.items.map((item, i) =>
      i === s.selected ? `  ▸ ${s.label(item, i)}` : `    ${s.label(item, i)}`,
    ),
    '  [↑/↓] select · [→/Enter] pick · [←/Esc] back',
  ]
}

function redraw<T>(s: SelectListState<T>): void {
  const lines = menuLines(s)
  if (s.firstDraw) {
    s.stdout.write('\n')
    s.firstDraw = false
  } else if (lines.length > 1) {
    s.stdout.write(`\x1b[${lines.length - 1}A\r`)
  }
  for (let i = 0; i < lines.length; i++) {
    s.stdout.write(`\x1b[K${lines[i]}`)
    if (i < lines.length - 1) {
      s.stdout.write('\n')
    }
  }
}

function eraseMenuBelowTuner(
  stdout: NodeJS.WriteStream,
  menuLineCount: number,
): void {
  if (menuLineCount < 1) return
  stdout.write(`\x1b[${menuLineCount}A\r`)
  for (let j = 0; j < menuLineCount; j++) {
    stdout.write('\n\x1b[K')
  }
  stdout.write(`\x1b[${menuLineCount}A\r`)
}

/** Routes keypresses while a list is active. Returns true if consumed. */
export function feedSelectListKey(key: MenuKey): boolean {
  const s = active as SelectListState<unknown> | null
  if (!s) return false

  if (key.kind === 'escape' || key.kind === 'left') {
    const n = menuLines(s).length
    active = null
    eraseMenuBelowTuner(s.stdout, n)
    s.resolve(null)
    return true
  }

  if (key.kind === 'enter' || key.kind === 'right') {
    const n = menuLines(s).length
    const idx = s.selected
    active = null
    eraseMenuBelowTuner(s.stdout, n)
    s.resolve(idx)
    return true
  }

  if (key.kind === 'up') {
    s.selected = s.selected <= 0 ? s.items.length - 1 : s.selected - 1
    redraw(s)
    return true
  }

  if (key.kind === 'down') {
    s.selected = s.selected >= s.items.length - 1 ? 0 : s.selected + 1
    redraw(s)
    return true
  }

  return true
}

export function isSelectListActive(): boolean {
  return active !== null
}

/**
 * Opens a modal list below the tuner line. Consumes keys via {@link feedSelectListKey}
 * until Enter/Right picks, Esc/Left backs out (resolve null).
 */
export function startSelectList<T>(options: {
  title: string
  items: readonly T[]
  label: (item: T, index: number) => string
  stdout: NodeJS.WriteStream
}): Promise<number | null> {
  if (options.items.length === 0) {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    const state: SelectListState<T> = {
      title: options.title,
      items: options.items,
      label: options.label,
      resolve,
      selected: 0,
      firstDraw: true,
      stdout: options.stdout,
    }
    active = state as SelectListState<unknown>
    redraw(state)
  })
}
