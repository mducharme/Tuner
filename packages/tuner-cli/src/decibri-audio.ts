import Decibri from 'decibri'
import type { AudioProvider } from 'tuner-core'

type DecibriInstance = InstanceType<typeof Decibri>

export type DecibriAudioOptions = {
  /** Substring or index from `Decibri.devices()` */
  device?: number | string
  /** Called when the mic stream errors after start */
  onStreamError?: (err: Error) => void
}

/**
 * Bridges decibri mic capture to {@link AudioProvider}: fixed-size float frames
 * for {@link TunerSession}.
 */
export class DecibriAudioProvider implements AudioProvider {
  private readonly sampleRate: number
  private readonly frameSamples: number
  private readonly device: number | string | undefined
  private readonly onStreamError: ((err: Error) => void) | undefined

  private mic: DecibriInstance | null = null
  private frameCallback: ((samples: Float32Array) => void) | null = null
  private accumulator: Float32Array
  private accWrite = 0

  constructor(
    sampleRate: number,
    frameSamples: number,
    options?: DecibriAudioOptions,
  ) {
    this.sampleRate = sampleRate
    this.frameSamples = frameSamples
    this.device = options?.device
    this.onStreamError = options?.onStreamError
    this.accumulator = new Float32Array(frameSamples)
  }

  getSampleRate(): number {
    return this.sampleRate
  }

  onFrame(callback: (samples: Float32Array) => void): void {
    this.frameCallback = callback
  }

  async start(): Promise<void> {
    if (this.mic) return

    const framesPerBuffer = Math.min(
      8192,
      Math.max(256, Math.floor(this.frameSamples / 2)),
    )

    const mic = new Decibri({
      sampleRate: this.sampleRate,
      channels: 1,
      format: 'float32',
      framesPerBuffer,
      ...(this.device !== undefined ? { device: this.device } : {}),
    })

    this.mic = mic
    this.accWrite = 0

    mic.on('data', (chunk: Buffer) => {
      this.pushPcm(chunk)
    })
    mic.on('error', (err: Error) => {
      this.onStreamError?.(err)
    })

    mic.resume()
  }

  stop(): void {
    if (!this.mic) return
    this.mic.removeAllListeners('data')
    this.mic.removeAllListeners('error')
    this.mic.stop()
    this.mic = null
    this.accWrite = 0
    this.accumulator.fill(0)
  }

  private pushPcm(chunk: Buffer): void {
    const sampleCount = chunk.length >> 2
    const f32 = new Float32Array(sampleCount)
    for (let i = 0; i < sampleCount; i++) {
      f32[i] = chunk.readFloatLE(i * 4)
    }

    let offset = 0
    while (offset < f32.length) {
      const take = Math.min(
        this.frameSamples - this.accWrite,
        f32.length - offset,
      )
      this.accumulator.set(f32.subarray(offset, offset + take), this.accWrite)
      this.accWrite += take
      offset += take
      if (this.accWrite >= this.frameSamples) {
        this.frameCallback?.(Float32Array.from(this.accumulator))
        this.accWrite = 0
      }
    }
  }
}
