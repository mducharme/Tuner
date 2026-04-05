import process from 'node:process'
import Decibri from 'decibri'
import {
  INSTRUMENTS,
  type PitchDetectorKind,
  TunerSession,
  createPitchDetector,
  findInstrument,
  findTuning,
  mergeTunerSettings,
} from 'tuner-core'
import type { ColorChoice } from './ansi.js'
import { DecibriAudioProvider } from './decibri-audio.js'
import {
  DISPLAY_STYLES,
  type DisplayStyle,
  defaultDisplayStyle,
  displayStyleLabel,
  renderTunerLine,
} from './display/styles.js'
import { installKeypress } from './input/keys.js'
import type { MenuKey } from './input/keys.js'
import {
  feedSelectListKey,
  isSelectListActive,
  startSelectList,
} from './menus/select-list.js'
import { CLI_DETECTORS, parseDeviceArg } from './parse-args.js'
import type { RunCliArgs } from './parsed-cli.js'
import { writeVerboseStartup } from './verbose-startup.js'

const RATE_PRESETS: readonly number[] = [44100, 48000, 96000]
const CENTS_PRESETS: readonly number[] = [1, 2, 3, 5, 7, 10, 15, 20, 25]
const COLOR_CHOICES: readonly ColorChoice[] = ['auto', 'always', 'never']

/** Marks the row that matches the active setting (cursor ▸ is separate). */
function menuLabelCurrent(text: string, isCurrent: boolean): string {
  return isCurrent ? `${text} — current` : text
}

function colorMenuBase(label: ColorChoice): string {
  if (label === 'auto') return 'auto (TTY / env)'
  if (label === 'always') return 'always'
  return 'never'
}

function deviceSummaryShort(raw: string | undefined): string {
  if (raw === undefined) return 'default (host)'
  const devices = Decibri.devices()
  const n = Number(raw)
  if (Number.isInteger(n) && String(n) === raw) {
    const d = devices.find((x) => x.index === n)
    if (d) return `[${d.index}] ${d.name}`
  }
  return raw.length > 28 ? `${raw.slice(0, 25)}…` : raw
}

type LiveSettings = {
  detector: PitchDetectorKind
  rate: number
  deviceRaw: string | undefined
  centsThreshold: number
  color: ColorChoice
}

export async function runTunerSession(args: RunCliArgs): Promise<void> {
  const instrument0 = findInstrument(args.instrumentId)
  if (!instrument0) {
    console.error(`Unknown instrument: ${args.instrumentId}`)
    process.exitCode = 1
    return
  }

  const tuning0 = findTuning(args.instrumentId, args.tuningId)
  if (!tuning0) {
    console.error(
      `Unknown tuning "${args.tuningId}" for instrument ${args.instrumentId}`,
    )
    process.exitCode = 1
    return
  }

  const isTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY)
  let instrumentId = args.instrumentId
  let tuningId = args.tuningId
  let instrument = instrument0
  let tuning = tuning0
  let displayStyle: DisplayStyle =
    args.style ?? defaultDisplayStyle(isTTY, process.env)

  const live: LiveSettings = {
    detector: args.detector,
    rate: args.rate,
    deviceRaw: args.device,
    centsThreshold: args.centsThreshold,
    color: args.color,
  }

  let termWidth = process.stdout.columns ?? 80
  process.stdout.on('resize', () => {
    termWidth = process.stdout.columns ?? 80
  })

  let session: TunerSession | null = null
  let lastTunerLine = ''

  const renderCtx = (): Parameters<typeof renderTunerLine>[1] => ({
    style: displayStyle,
    colorChoice: live.color,
    termWidth,
    isTTY: Boolean(process.stdout.isTTY),
    env: process.env,
  })

  const formatBanner = (): string =>
    `Listening (${instrument.name} — ${tuning.name} @ ${live.rate} Hz). ` +
    `${isTTY ? '[i/t/s/a] menus · ' : ''}[q / Esc] to quit.`

  const refreshBanner = (): void => {
    if (!process.stdout.isTTY) return
    process.stdout.write(
      `\x1b[1A\r\x1b[K${formatBanner()}\n\r\x1b[K${lastTunerLine}`,
    )
  }

  function reprintVerboseConfig(): void {
    if (!args.verbose) return
    const tunerSettings = mergeTunerSettings({ pitchDetector: live.detector })
    const snapshot: RunCliArgs = {
      verbose: args.verbose,
      rate: live.rate,
      instrumentId,
      tuningExplicit: args.tuningExplicit,
      tuningId,
      detector: live.detector,
      centsThreshold: live.centsThreshold,
      color: live.color,
      ...(live.deviceRaw !== undefined ? { device: live.deviceRaw } : {}),
      ...(displayStyle !== undefined ? { style: displayStyle } : {}),
    }
    writeVerboseStartup(process.stderr, {
      args: snapshot,
      displayStyle,
      isTTY,
      stdoutTTY: Boolean(process.stdout.isTTY),
      instrumentId,
      instrumentName: instrument.name,
      tuningId,
      tuningName: tuning.name,
      audioFrameSamples: tunerSettings.audioFrameSamples,
      deviceRaw: live.deviceRaw,
      deviceParsed: parseDeviceArg(live.deviceRaw),
      afterChange: true,
    })
  }

  function wireSessionHandlers(s: TunerSession): void {
    s.on('result', (result) => {
      if (isSelectListActive()) return
      const line = renderTunerLine(result, renderCtx())
      lastTunerLine = line
      process.stdout.write(`\r\x1b[K${line}`)
    })
    s.on('error', (err) => {
      console.error(`\n${err.message}`)
      process.exitCode = 1
    })
  }

  async function restartEngine(fatalOnError: boolean): Promise<boolean> {
    try {
      session?.stop()
      session = null
      const tunerSettings = mergeTunerSettings({ pitchDetector: live.detector })
      const deviceOpt = parseDeviceArg(live.deviceRaw)
      const audio = new DecibriAudioProvider(
        live.rate,
        tunerSettings.audioFrameSamples,
        {
          ...(deviceOpt !== undefined ? { device: deviceOpt } : {}),
          onStreamError: (err) => {
            console.error(`\nAudio error: ${err.message}`)
            session?.stop()
            process.exitCode = 1
            process.exit()
          },
        },
      )
      const pitchDetector = createPitchDetector(tunerSettings)
      const s = new TunerSession(audio, pitchDetector, tunerSettings)
      s.setTuning(tuning)
      s.applyPreferences({ centsThreshold: live.centsThreshold })
      wireSessionHandlers(s)
      await s.start()
      session = s
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`Failed to start audio: ${msg}`)
      if (fatalOnError) {
        process.exitCode = 1
        process.exit(1)
      }
      return false
    }
  }

  let uninstallKeys: (() => void) | null = null

  const shutdown = (): void => {
    uninstallKeys?.()
    uninstallKeys = null
    session?.stop()
    process.stdout.write('\n')
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('SIGBREAK', shutdown)

  const tunerSettingsInitial = mergeTunerSettings({
    pitchDetector: live.detector,
  })
  const deviceOptInitial = parseDeviceArg(live.deviceRaw)

  if (args.verbose) {
    writeVerboseStartup(process.stderr, {
      args,
      displayStyle,
      isTTY,
      stdoutTTY: Boolean(process.stdout.isTTY),
      instrumentId,
      instrumentName: instrument.name,
      tuningId,
      tuningName: tuning.name,
      audioFrameSamples: tunerSettingsInitial.audioFrameSamples,
      deviceRaw: live.deviceRaw,
      deviceParsed: deviceOptInitial,
    })
  }

  if (!(await restartEngine(false))) {
    process.exitCode = 1
    return
  }

  process.stdout.write(`${formatBanner()}\n`)

  let menuBusy = false

  const runMenu = (work: () => Promise<void>): void => {
    menuBusy = true
    void work().finally(() => {
      menuBusy = false
    })
  }

  const runInstrumentPicker = async (): Promise<void> => {
    const idx = await startSelectList({
      title: 'Instrument',
      items: INSTRUMENTS,
      label: (it) => menuLabelCurrent(it.name, it.id === instrumentId),
      stdout: process.stdout,
    })
    if (idx === null) return
    const inst = INSTRUMENTS[idx]
    if (!inst) return
    instrumentId = inst.id
    instrument = inst
    const keep = inst.tunings.find((t) => t.id === tuningId)
    tuningId = keep ? tuningId : (inst.tunings[0]?.id ?? tuningId)
    const tun = findTuning(instrumentId, tuningId) ?? inst.tunings[0] ?? null
    if (tun) {
      tuning = tun
      session?.setTuning(tun)
      refreshBanner()
    }
    reprintVerboseConfig()
  }

  const runTuningPicker = async (): Promise<void> => {
    const idx = await startSelectList({
      title: `Tuning — ${instrument.name}`,
      items: instrument.tunings,
      label: (t) => menuLabelCurrent(t.name, t.id === tuningId),
      stdout: process.stdout,
    })
    if (idx === null) return
    const tun = instrument.tunings[idx]
    if (!tun) return
    tuningId = tun.id
    tuning = tun
    session?.setTuning(tun)
    refreshBanner()
    reprintVerboseConfig()
  }

  const runStylePicker = async (): Promise<void> => {
    const idx = await startSelectList({
      title: 'Display style',
      items: DISPLAY_STYLES,
      label: (s) => menuLabelCurrent(displayStyleLabel(s), s === displayStyle),
      stdout: process.stdout,
    })
    if (idx === null) return
    const st = DISPLAY_STYLES[idx]
    if (st) {
      displayStyle = st
      reprintVerboseConfig()
    }
  }

  const runAdvancedMenu = async (): Promise<void> => {
    while (true) {
      const advancedRows = [
        `Pitch detector — ${live.detector}`,
        `Sample rate — ${live.rate} Hz`,
        `Input device — ${deviceSummaryShort(live.deviceRaw)}`,
        `Cents threshold — ±${live.centsThreshold}`,
        `Color — ${live.color}`,
        `Display style — ${displayStyleLabel(displayStyle)}`,
        `Instrument — ${instrument.name}`,
        `Tuning — ${tuning.name}`,
      ]
      const idx = await startSelectList({
        title: 'Advanced options',
        items: advancedRows,
        label: (row) => row,
        stdout: process.stdout,
      })
      if (idx === null) return

      switch (idx) {
        case 0: {
          const j = await startSelectList({
            title: 'Pitch detector',
            items: [...CLI_DETECTORS],
            label: (d) => menuLabelCurrent(d, d === live.detector),
            stdout: process.stdout,
          })
          if (j === null) break
          const d = CLI_DETECTORS[j]
          if (d === undefined || d === live.detector) break
          live.detector = d
          await restartEngine(true)
          refreshBanner()
          reprintVerboseConfig()
          break
        }
        case 1: {
          const j = await startSelectList({
            title: 'Sample rate (restarts audio)',
            items: [...RATE_PRESETS],
            label: (hz) => menuLabelCurrent(`${hz} Hz`, hz === live.rate),
            stdout: process.stdout,
          })
          if (j === null) break
          const hz = RATE_PRESETS[j]
          if (hz === undefined || hz === live.rate) break
          live.rate = hz
          await restartEngine(true)
          refreshBanner()
          reprintVerboseConfig()
          break
        }
        case 2: {
          const devices = Decibri.devices()
          type DevRow = { label: string; raw: string | undefined }
          const items: DevRow[] = [
            { label: 'Default (host input)', raw: undefined },
            ...devices.map((dev) => ({
              raw: String(dev.index),
              label: `[${dev.index}] ${dev.name}${dev.isDefault ? ' (default)' : ''}`,
            })),
          ]
          const j = await startSelectList({
            title: 'Input device (restarts audio)',
            items,
            label: (row) =>
              menuLabelCurrent(row.label, row.raw === live.deviceRaw),
            stdout: process.stdout,
          })
          if (j === null) break
          const row = items[j]
          if (row === undefined) break
          const nextRaw = row.raw
          if (nextRaw === live.deviceRaw) break
          live.deviceRaw = nextRaw
          await restartEngine(true)
          refreshBanner()
          reprintVerboseConfig()
          break
        }
        case 3: {
          const j = await startSelectList({
            title: 'Cents threshold',
            items: [...CENTS_PRESETS],
            label: (n) =>
              menuLabelCurrent(`±${n} cents`, n === live.centsThreshold),
            stdout: process.stdout,
          })
          if (j === null) break
          const n = CENTS_PRESETS[j]
          if (n === undefined || n === live.centsThreshold) break
          live.centsThreshold = n
          session?.applyPreferences({ centsThreshold: n })
          reprintVerboseConfig()
          break
        }
        case 4: {
          const j = await startSelectList({
            title: 'Color (SGR)',
            items: [...COLOR_CHOICES],
            label: (c) => menuLabelCurrent(colorMenuBase(c), c === live.color),
            stdout: process.stdout,
          })
          if (j === null) break
          const c = COLOR_CHOICES[j]
          if (c === undefined || c === live.color) break
          live.color = c
          reprintVerboseConfig()
          break
        }
        case 5: {
          await runStylePicker()
          break
        }
        case 6: {
          await runInstrumentPicker()
          break
        }
        case 7: {
          await runTuningPicker()
          break
        }
        default:
          break
      }
    }
  }

  const routeKey = (mk: MenuKey): void => {
    if (feedSelectListKey(mk)) return
    if (mk.kind === 'ctrl-c') {
      shutdown()
      return
    }
    if (mk.kind === 'escape') {
      shutdown()
      return
    }
    if (!isTTY || mk.kind !== 'letter') return
    if (isSelectListActive() || menuBusy) return

    if (mk.ch === 'q') {
      shutdown()
      return
    }

    if (mk.ch === 'i') {
      runMenu(runInstrumentPicker)
      return
    }

    if (mk.ch === 't') {
      runMenu(runTuningPicker)
      return
    }

    if (mk.ch === 's') {
      runMenu(runStylePicker)
      return
    }

    if (mk.ch === 'a') {
      runMenu(runAdvancedMenu)
    }
  }

  if (isTTY) {
    const { onKey, uninstall } = installKeypress(process.stdin)
    uninstallKeys = uninstall
    onKey(routeKey)
  }

  await new Promise<void>(() => {
    /* until signal */
  })
}
