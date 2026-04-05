import Decibri from 'decibri'
import { INSTRUMENTS, findInstrument } from 'tuner-core'

export function listAudioDevices(): void {
  const devices = Decibri.devices()
  if (devices.length === 0) {
    console.log('No input devices found.')
    return
  }
  for (const d of devices) {
    const def = d.isDefault ? ' (default)' : ''
    console.log(`  [${d.index}] ${d.name}${def}  ${d.defaultSampleRate} Hz`)
  }
}

export function listInstruments(): void {
  for (const inst of INSTRUMENTS) {
    console.log(`  ${inst.id}  ${inst.name}`)
  }
}

/** @returns false if instrument id is unknown */
export function listTunings(instrumentId: string): boolean {
  const inst = findInstrument(instrumentId)
  if (!inst) {
    console.error(`Unknown instrument: ${instrumentId}`)
    return false
  }
  for (const t of inst.tunings) {
    console.log(`  ${t.id}  ${t.name}`)
  }
  return true
}
