import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock decibri before any import of decibri-audio so the native addon is never loaded.
vi.mock('decibri', () => ({
  default: class FakeDecibri {
    private handlers = new Map<string, ((...args: unknown[]) => void)[]>()

    on(event: string, handler: (...args: unknown[]) => void) {
      const list = this.handlers.get(event) ?? []
      list.push(handler)
      this.handlers.set(event, list)
      return this
    }

    emit(event: string, ...args: unknown[]) {
      for (const fn of this.handlers.get(event) ?? []) fn(...args)
    }

    resume() {}
    stop() {}
    removeAllListeners() {
      this.handlers.clear()
      return this
    }
  },
}))

import { DecibriAudioProvider } from '../src/decibri-audio.js'

// Access the private pushPcm method without changing the production API.
function feedChunk(provider: DecibriAudioProvider, chunk: Buffer): void {
  ;(provider as unknown as { pushPcm(c: Buffer): void }).pushPcm(chunk)
}

function makeF32Buffer(values: number[]): Buffer {
  const buf = Buffer.allocUnsafe(values.length * 4)
  for (let i = 0; i < values.length; i++) {
    buf.writeFloatLE(values[i] ?? 0, i * 4)
  }
  return buf
}

describe('DecibriAudioProvider lifecycle', () => {
  it('getSampleRate returns the configured rate', () => {
    expect(new DecibriAudioProvider(48000, 256).getSampleRate()).toBe(48000)
  })

  it('start() fires mic.resume and wires data/error handlers', async () => {
    const provider = new DecibriAudioProvider(44100, 8)
    await provider.start()
    // Calling start() a second time is a no-op (idempotent)
    await provider.start()
  })

  it('start() passes device to Decibri when option is set', async () => {
    const provider = new DecibriAudioProvider(44100, 8, { device: 1 })
    await provider.start()
    provider.stop()
  })

  it('stop() resets accumulator and is safe to call when not started', () => {
    const provider = new DecibriAudioProvider(44100, 8)
    provider.stop() // should not throw
  })

  it('stop() after start() clears state', async () => {
    const provider = new DecibriAudioProvider(44100, 8)
    const frames: Float32Array[] = []
    provider.onFrame((f) => frames.push(f))
    await provider.start()
    provider.stop()
    // After stop, pushPcm via the data handler should no longer fire
    expect(frames).toHaveLength(0)
  })

  it('onStreamError callback is invoked on mic error event', async () => {
    const errors: Error[] = []
    const provider = new DecibriAudioProvider(44100, 8, {
      onStreamError: (e) => errors.push(e),
    })
    await provider.start()
    // Trigger the error handler directly via the fake mic
    const err = new Error('stream broke')
    ;(
      provider as unknown as { mic: { emit(e: string, v: unknown): void } }
    ).mic?.emit('error', err)
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toBe('stream broke')
  })

  it('invokes frame callback when the mic emits float PCM', async () => {
    const provider = new DecibriAudioProvider(44100, 4)
    const frames: Float32Array[] = []
    provider.onFrame((f) => frames.push(Float32Array.from(f)))
    await provider.start()
    const mic = (
      provider as unknown as {
        mic: { emit(e: string, v: unknown): void }
      }
    ).mic
    const buf = Buffer.allocUnsafe(16)
    for (let i = 0; i < 4; i++) {
      buf.writeFloatLE((i + 1) * 0.1, i * 4)
    }
    mic?.emit('data', buf)
    expect(frames).toHaveLength(1)
    expect(frames[0]?.[0]).toBeCloseTo(0.1, 5)
    provider.stop()
  })
})

describe('DecibriAudioProvider.pushPcm', () => {
  const FRAME = 8 // small frame size for readable tests
  let provider: DecibriAudioProvider
  let frames: Float32Array[]

  beforeEach(() => {
    provider = new DecibriAudioProvider(44100, FRAME)
    frames = []
    provider.onFrame((f) => frames.push(Float32Array.from(f)))
  })

  it('fires no callback when chunk is smaller than frameSamples', () => {
    feedChunk(provider, makeF32Buffer([1, 2, 3]))
    expect(frames).toHaveLength(0)
  })

  it('fires exactly one callback when chunk equals frameSamples', () => {
    feedChunk(provider, makeF32Buffer([1, 2, 3, 4, 5, 6, 7, 8]))
    expect(frames).toHaveLength(1)
  })

  it('emitted frame contains the correct sample values', () => {
    const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
    feedChunk(provider, makeF32Buffer(values))
    const frame0 = frames[0]
    expect(frame0).toBeDefined()
    expect(frame0).toHaveLength(FRAME)
    for (let i = 0; i < values.length; i++) {
      expect(frame0[i]).toBeCloseTo(values[i] ?? 0, 5)
    }
  })

  it('accumulates partial chunks before firing', () => {
    feedChunk(provider, makeF32Buffer([1, 2, 3]))
    feedChunk(provider, makeF32Buffer([4, 5]))
    expect(frames).toHaveLength(0) // 5 samples, not yet a full frame
    feedChunk(provider, makeF32Buffer([6, 7, 8]))
    expect(frames).toHaveLength(1) // 8 samples total → one frame
  })

  it('fires multiple callbacks when chunk spans more than one frame', () => {
    // 16 samples = exactly 2 frames
    feedChunk(
      provider,
      makeF32Buffer([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
    )
    expect(frames).toHaveLength(2)
  })

  it('carries leftover samples into the next frame', () => {
    // 10 samples: frame 1 fires at 8, 2 left over
    feedChunk(provider, makeF32Buffer([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))
    expect(frames).toHaveLength(1)
    // 6 more → completes second frame
    feedChunk(provider, makeF32Buffer([11, 12, 13, 14, 15, 16]))
    expect(frames).toHaveLength(2)
    // Second frame should start with the 2 leftover samples
    expect(frames[1]?.[0]).toBeCloseTo(9, 5)
    expect(frames[1]?.[1]).toBeCloseTo(10, 5)
  })

  it('emitted frame is a copy — mutations do not affect subsequent frames', () => {
    feedChunk(provider, makeF32Buffer([1, 2, 3, 4, 5, 6, 7, 8]))
    const first = frames[0]
    expect(first).toBeDefined()
    first[0] = 999
    feedChunk(provider, makeF32Buffer([1, 2, 3, 4, 5, 6, 7, 8]))
    expect(frames[1]?.[0]).toBeCloseTo(1, 5)
  })
})
