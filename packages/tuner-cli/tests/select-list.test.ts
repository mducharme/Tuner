import { describe, expect, it } from 'vitest'
import { feedSelectListKey, startSelectList } from '../src/menus/select-list.js'

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
})
