import { describe, expect, it } from 'vitest'
import {
  feedSelectListKey,
  isSelectListActive,
  startSelectList,
} from '../src/menus/select-list.js'

function mockStdout(): NodeJS.WriteStream {
  return { write: () => {} } as NodeJS.WriteStream
}

describe('startSelectList / feedSelectListKey', () => {
  it('treats → like Enter (pick)', async () => {
    const p = startSelectList({
      title: 'T',
      items: ['a', 'b'],
      label: (x) => x,
      stdout: mockStdout(),
    })
    feedSelectListKey({ kind: 'down' })
    feedSelectListKey({ kind: 'right' })
    await expect(p).resolves.toBe(1)
  })

  it('treats ← like Esc (back)', async () => {
    const p = startSelectList({
      title: 'T',
      items: ['a'],
      label: (x) => x,
      stdout: mockStdout(),
    })
    feedSelectListKey({ kind: 'left' })
    await expect(p).resolves.toBeNull()
  })

  it('resolves null immediately for empty items', async () => {
    await expect(
      startSelectList({
        title: 'T',
        items: [],
        label: (x) => x,
        stdout: mockStdout(),
      }),
    ).resolves.toBeNull()
  })

  it('wraps selection upward from the first row', async () => {
    const p = startSelectList({
      title: 'T',
      items: ['a', 'b'],
      label: (x) => x,
      stdout: mockStdout(),
    })
    expect(isSelectListActive()).toBe(true)
    feedSelectListKey({ kind: 'up' })
    feedSelectListKey({ kind: 'enter' })
    await expect(p).resolves.toBe(1)
    expect(isSelectListActive()).toBe(false)
  })

  it('wraps selection downward from the last row', async () => {
    const p = startSelectList({
      title: 'T',
      items: ['a', 'b'],
      label: (x) => x,
      stdout: mockStdout(),
    })
    feedSelectListKey({ kind: 'down' })
    feedSelectListKey({ kind: 'down' })
    feedSelectListKey({ kind: 'enter' })
    await expect(p).resolves.toBe(0)
  })

  it('consumes unmapped keys while the list stays open', async () => {
    const p = startSelectList({
      title: 'T',
      items: ['only'],
      label: (x) => x,
      stdout: mockStdout(),
    })
    expect(feedSelectListKey({ kind: 'letter', ch: 'z' })).toBe(true)
    feedSelectListKey({ kind: 'escape' })
    await expect(p).resolves.toBeNull()
  })
})
