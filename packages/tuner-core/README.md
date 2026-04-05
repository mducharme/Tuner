# tuner-core

Pitch detection (**YIN**, **pYIN / HMM**, **MPM / McLeod**, **autocorrelation**) and a small **tuner session** API (smoothing, confidence gating, note / cents, tunings registry). Made for browsers, Node, or native shells by injecting an `AudioProvider`.

## Requirements

- **Node.js 20+**
- **ESM only** (`import`, not `require`). CommonJS callers must use dynamic `import()`.

## Install

```bash
npm install tuner-core
```

## Why several detectors?

Different algorithms trade off **latency**, **stability**, **CPU cost**, and **robustness** to noise, vibrato, and false subharmonics. Shipping multiple implementations lets you **benchmark under real rooms and instruments**, A/B in your UI, and fall back when one misbehaves on a given platform.

**Predictive YIN (pYIN)** is the **default** in `DEFAULT_TUNER_SETTINGS`: it combines YIN-style observations with a small HMM so the pitch track is steadier in practice for monophonic tuning. It is the one most likely to match what ships in end-user products; the others stay available for comparison and tuning.

## Using `TunerSession` and reading results

You bring an **`AudioProvider`** (mic / `AudioWorklet` / native capture): it exposes sample rate, registers a frame callback, and implements `start()` / `stop()`. **`TunerSession`** wires that stream to a **`PitchDetector`**, applies median smoothing and confidence gating, then emits **`TunerResult`** on each analyzed frame.

```ts
import {
  TunerSession,
  createPitchDetector,
  mergeTunerSettings,
  findTuning,
  type AudioProvider,
  type TunerResult,
} from 'tuner-core'

const settings = mergeTunerSettings({
  pitchDetector: 'pyin', // or 'yin' | 'mpm' | 'autocorrelation'
  medianWindowSize: 7,
  minConfidence: 0.28,
})

const audio: AudioProvider = {
  /* your implementation: getSampleRate, onFrame, start, stop */
}
const detector = createPitchDetector(settings)
const session = new TunerSession(audio, detector, settings)

// Optional: guitar / bass context for string dots and in-tune hints
const tuning = findTuning('guitar', 'guitar-standard')
session.setTuning(tuning ?? null)
session.applyPreferences({ centsThreshold: 5 })

session.on('started', () => {
  console.log('capture started')
})
session.on('stopped', () => {
  console.log('capture stopped')
})
session.on('error', (err) => {
  console.error(err.message)
})

session.on('result', (r: TunerResult) => {
  // Smoothed display pitch (Hz); may hold last confident value if current frame is weak
  console.log(r.frequency)

  // Nearest chromatic note
  console.log(r.note, r.octave) // e.g. "A", 4

  // Cents from that semitone (-50 … +50 after rounding in core helpers)
  console.log(r.cents)

  // If setTuning() was used: nearest string, how far in cents, and in-tune vs prefs
  if (r.closestString) {
    console.log(
      r.closestString.name,
      r.closestString.centsOff,
      r.closestString.inTune,
    )
  }

  // Copy of open strings for UI pills / labels, or null if no tuning selected
  console.log(r.tuningStrings)
})

await session.start()
// … later …
session.stop()
```

Each **`result`** event is one synthesis of the pipeline: **raw detector output → median window → confidence gate (hold last good pitch when unsure) → MIDI / note / cents / optional string math**.

## More

Source and CLI: [github.com/mducharme/Tuner](https://github.com/mducharme/Tuner).

## Publish (maintainers)

From the monorepo root (with a clean build and tests green):

```bash
pnpm --filter tuner-core build
pnpm --filter tuner-core run package:assert
pnpm --filter tuner-core publish --access public
```

Prefer **npm provenance** via GitHub Actions (see `.github/workflows/publish.yml`) and [trusted publishers](https://docs.npmjs.com/trusted-publishers).

`prepublishOnly` runs `tsc`, `publint --strict`, and **Are The Types Wrong?** (`attw --pack . --profile esm-only`).

## License

MIT — see [LICENSE](./LICENSE).
