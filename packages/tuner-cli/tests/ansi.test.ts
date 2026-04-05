import { describe, expect, it } from 'vitest'
import { stripAnsi } from '../src/ansi.js'

describe('stripAnsi', () => {
  it('removes SGR color sequences', () => {
    const s = `${String.fromCharCode(27)}[32mok${String.fromCharCode(27)}[0m`
    expect(stripAnsi(s)).toBe('ok')
  })

  it('leaves plain text unchanged', () => {
    expect(stripAnsi('hello')).toBe('hello')
  })
})
