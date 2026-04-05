const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

const A4_FREQUENCY = 440
const A4_MIDI = 69

/**
 * Convert a frequency in Hz to a MIDI note number (float).
 */
export function frequencyToMidi(frequency: number): number {
  return 12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI
}

/**
 * Convert a MIDI note number to frequency in Hz.
 */
export function midiToFrequency(midi: number): number {
  return A4_FREQUENCY * 2 ** ((midi - A4_MIDI) / 12)
}

/**
 * Get the note name for a MIDI note number.
 */
export function midiToNote(midi: number): string {
  const name = NOTE_NAMES[Math.round(midi) % 12]
  return name ?? 'A'
}

/**
 * Get the octave for a MIDI note number.
 */
export function midiToOctave(midi: number): number {
  return Math.floor(Math.round(midi) / 12) - 1
}

/**
 * Get cents deviation from the nearest semitone (-50 to +50).
 */
export function getCents(frequency: number): number {
  const midi = frequencyToMidi(frequency)
  const nearestMidi = Math.round(midi)
  return Math.round((midi - nearestMidi) * 100)
}

/**
 * Get cents deviation between a detected frequency and a target frequency.
 */
export function getCentsFromTarget(detected: number, target: number): number {
  return Math.round(1200 * Math.log2(detected / target))
}
