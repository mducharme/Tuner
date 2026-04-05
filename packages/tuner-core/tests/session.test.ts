import { describe, expect, it, vi } from 'vitest'
import { TunerSession } from '../src/session.js'
import { mergeTunerSettings } from '../src/tuner-settings.js'
import type {
  AudioProvider,
  PitchDetection,
  PitchDetector,
  TunerResult,
  Tuning,
} from '../src/types.js'

class MockAudio implements AudioProvider {
  readonly sampleRate: number
  private frameHandler: ((samples: Float32Array) => void) | null = null

  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate
  }

  getSampleRate(): number {
    return this.sampleRate
  }

  onFrame(callback: (samples: Float32Array) => void): void {
    this.frameHandler = callback
  }

  async start(): Promise<void> {}

  stop(): void {}

  emitFrame(samples: Float32Array): void {
    this.frameHandler?.(samples)
  }
}

class MockDetector implements PitchDetector {
  constructor(private readonly frequency: number | null) {}

  detect(): PitchDetection {
    if (this.frequency === null) {
      return { frequency: null, confidence: 0 }
    }
    return { frequency: this.frequency, confidence: 1 }
  }
}

class MockDetectorWithConfidence implements PitchDetector {
  private frame = 0

  constructor(
    private readonly hz: number,
    private readonly sequence: readonly number[],
  ) {}

  detect(): PitchDetection {
    const conf =
      this.sequence[this.frame] ?? this.sequence[this.sequence.length - 1] ?? 0
    this.frame += 1
    return { frequency: this.hz, confidence: conf }
  }
}

const guitarStandard: Tuning = {
  id: 'guitar-standard',
  name: 'Standard',
  strings: [
    { name: 'E2', frequency: 82.41 },
    { name: 'A2', frequency: 110.0 },
    { name: 'D3', frequency: 146.83 },
    { name: 'G3', frequency: 196.0 },
    { name: 'B3', frequency: 246.94 },
    { name: 'E4', frequency: 329.63 },
  ],
}

describe('TunerSession', () => {
  it('reports isRunning and ignores redundant start/stop', async () => {
    const audio = new MockAudio()
    const session = new TunerSession(audio, new MockDetector(null))
    expect(session.isRunning).toBe(false)
    await session.start()
    expect(session.isRunning).toBe(true)
    await session.start()
    expect(session.isRunning).toBe(true)
    session.stop()
    expect(session.isRunning).toBe(false)
    session.stop()
    expect(session.isRunning).toBe(false)
  })

  it('off() removes a listener', async () => {
    const audio = new MockAudio()
    const session = new TunerSession(audio, new MockDetector(440))
    const results: unknown[] = []
    const listener = (r: TunerResult) => {
      results.push(r)
    }
    session.on('result', listener)
    await session.start()
    audio.emitFrame(new Float32Array(256))
    expect(results).toHaveLength(1)
    session.off('result', listener)
    audio.emitFrame(new Float32Array(256))
    expect(results).toHaveLength(1)
    session.stop()
  })

  it('emits started after start()', async () => {
    const audio = new MockAudio()
    const session = new TunerSession(audio, new MockDetector(null))
    const started = vi.fn()
    session.on('started', started)
    await session.start()
    expect(started).toHaveBeenCalledTimes(1)
    session.stop()
  })

  it('emits stopped after stop()', async () => {
    const audio = new MockAudio()
    const session = new TunerSession(audio, new MockDetector(null))
    const stopped = vi.fn()
    session.on('stopped', stopped)
    await session.start()
    session.stop()
    expect(stopped).toHaveBeenCalledTimes(1)
  })

  it('emits result when detector returns a frequency', async () => {
    const audio = new MockAudio()
    const session = new TunerSession(audio, new MockDetector(440))
    const results: unknown[] = []
    session.on('result', (r) => {
      results.push(r)
    })
    await session.start()
    audio.emitFrame(new Float32Array(256))
    expect(results).toHaveLength(1)
    const r = results[0] as { frequency: number; note: string; octave: number }
    expect(r.frequency).toBe(440)
    expect(r.note).toBe('A')
    expect(r.octave).toBe(4)
    session.stop()
  })

  it('does not emit result when detector returns null', async () => {
    const audio = new MockAudio()
    const session = new TunerSession(audio, new MockDetector(null))
    const results: unknown[] = []
    session.on('result', (r) => {
      results.push(r)
    })
    await session.start()
    audio.emitFrame(new Float32Array(256))
    expect(results).toHaveLength(0)
    session.stop()
  })

  it('computes closestString when tuning is active', async () => {
    const audio = new MockAudio()
    const session = new TunerSession(audio, new MockDetector(82.41))
    session.setTuning(guitarStandard)
    session.applyPreferences({ centsThreshold: 5 })
    const results: TunerResult[] = []
    session.on('result', (r) => {
      results.push(r)
    })
    await session.start()
    audio.emitFrame(new Float32Array(256))
    expect(results).toHaveLength(1)
    expect(results[0]?.closestString).not.toBeNull()
    expect(results[0]?.closestString?.name).toBe('E2')
    expect(results[0]?.closestString?.inTune).toBe(true)
    expect(results[0]?.tuningStrings).toEqual(guitarStandard.strings)
    session.stop()
  })

  it('keeps last confident frequency when confidence drops below threshold', async () => {
    const audio = new MockAudio()
    const minConf = 0.5
    const session = new TunerSession(
      audio,
      new MockDetectorWithConfidence(440, [0.9, 0.1, 0.1]),
      mergeTunerSettings({ minConfidence: minConf, medianWindowSize: 1 }),
    )
    const freqs: number[] = []
    session.on('result', (r) => {
      freqs.push(r.frequency)
    })
    await session.start()
    audio.emitFrame(new Float32Array(256))
    audio.emitFrame(new Float32Array(256))
    audio.emitFrame(new Float32Array(256))
    expect(freqs).toEqual([440, 440, 440])
    session.stop()
  })

  it('median smoothing produces the median of the recent frequency window', async () => {
    class SequenceDetector implements PitchDetector {
      private i = 0
      constructor(private readonly seq: number[]) {}
      detect(): PitchDetection {
        const f = this.seq[this.i] ?? this.seq[this.seq.length - 1] ?? 440
        this.i++
        return { frequency: f, confidence: 1 }
      }
    }

    const audio = new MockAudio()
    // Three frames: 100, 300, 200 Hz. With window=3:
    //   frame 1 → median([100])        = 100
    //   frame 2 → median([100, 300])   = 200  (even window: average)
    //   frame 3 → median([100, 300, 200]) = 200 (odd: middle of sorted [100,200,300])
    const session = new TunerSession(
      audio,
      new SequenceDetector([100, 300, 200]),
      mergeTunerSettings({ medianWindowSize: 3, minConfidence: 0 }),
    )
    const freqs: number[] = []
    session.on('result', (r) => {
      freqs.push(r.frequency)
    })
    await session.start()
    audio.emitFrame(new Float32Array(256))
    audio.emitFrame(new Float32Array(256))
    audio.emitFrame(new Float32Array(256))
    expect(freqs).toEqual([100, 200, 200])
    session.stop()
  })

  it('emits error when audio.start rejects', async () => {
    const audio: AudioProvider = {
      getSampleRate: () => 44100,
      onFrame: () => {},
      start: async () => {
        throw new Error('mic denied')
      },
      stop: () => {},
    }
    const session = new TunerSession(audio, new MockDetector(null))
    const errors: Error[] = []
    session.on('error', (e) => {
      errors.push(e)
    })
    await session.start()
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toBe('mic denied')
  })
})
