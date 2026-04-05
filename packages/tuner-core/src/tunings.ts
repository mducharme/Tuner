import type { Instrument } from './types.js'

export const INSTRUMENTS: Instrument[] = [
  {
    id: 'guitar',
    name: 'Guitar',
    tunings: [
      {
        id: 'guitar-standard',
        name: 'Standard (EADGBe)',
        strings: [
          { name: 'E2', frequency: 82.41 },
          { name: 'A2', frequency: 110.0 },
          { name: 'D3', frequency: 146.83 },
          { name: 'G3', frequency: 196.0 },
          { name: 'B3', frequency: 246.94 },
          { name: 'E4', frequency: 329.63 },
        ],
      },
      {
        id: 'guitar-drop-d',
        name: 'Drop D (DADGBe)',
        strings: [
          { name: 'D2', frequency: 73.42 },
          { name: 'A2', frequency: 110.0 },
          { name: 'D3', frequency: 146.83 },
          { name: 'G3', frequency: 196.0 },
          { name: 'B3', frequency: 246.94 },
          { name: 'E4', frequency: 329.63 },
        ],
      },
      {
        id: 'guitar-drop-c',
        name: 'Drop C (CGCFAd)',
        strings: [
          { name: 'C2', frequency: 65.41 },
          { name: 'G2', frequency: 98.0 },
          { name: 'C3', frequency: 130.81 },
          { name: 'F3', frequency: 174.61 },
          { name: 'A3', frequency: 220.0 },
          { name: 'D4', frequency: 293.66 },
        ],
      },
      {
        id: 'guitar-half-step-down',
        name: 'Half Step Down (Eb)',
        strings: [
          { name: 'Eb2', frequency: 77.78 },
          { name: 'Ab2', frequency: 103.83 },
          { name: 'Db3', frequency: 138.59 },
          { name: 'Gb3', frequency: 185.0 },
          { name: 'Bb3', frequency: 233.08 },
          { name: 'Eb4', frequency: 311.13 },
        ],
      },
      {
        id: 'guitar-open-g',
        name: 'Open G (DGDGBd)',
        strings: [
          { name: 'D2', frequency: 73.42 },
          { name: 'G2', frequency: 98.0 },
          { name: 'D3', frequency: 146.83 },
          { name: 'G3', frequency: 196.0 },
          { name: 'B3', frequency: 246.94 },
          { name: 'D4', frequency: 293.66 },
        ],
      },
      {
        id: 'guitar-open-d',
        name: 'Open D (DADf#ad)',
        strings: [
          { name: 'D2', frequency: 73.42 },
          { name: 'A2', frequency: 110.0 },
          { name: 'D3', frequency: 146.83 },
          { name: 'F#3', frequency: 185.0 },
          { name: 'A3', frequency: 220.0 },
          { name: 'D4', frequency: 293.66 },
        ],
      },
      {
        id: 'guitar-dadgad',
        name: 'DADGAD',
        strings: [
          { name: 'D2', frequency: 73.42 },
          { name: 'A2', frequency: 110.0 },
          { name: 'D3', frequency: 146.83 },
          { name: 'G3', frequency: 196.0 },
          { name: 'A3', frequency: 220.0 },
          { name: 'D4', frequency: 293.66 },
        ],
      },
    ],
  },
  {
    id: 'bass',
    name: 'Bass',
    tunings: [
      {
        id: 'bass-standard-4',
        name: 'Standard 4-string (EADg)',
        strings: [
          { name: 'E1', frequency: 41.2 },
          { name: 'A1', frequency: 55.0 },
          { name: 'D2', frequency: 73.42 },
          { name: 'G2', frequency: 98.0 },
        ],
      },
      {
        id: 'bass-standard-5',
        name: 'Standard 5-string (BEADg)',
        strings: [
          { name: 'B0', frequency: 30.87 },
          { name: 'E1', frequency: 41.2 },
          { name: 'A1', frequency: 55.0 },
          { name: 'D2', frequency: 73.42 },
          { name: 'G2', frequency: 98.0 },
        ],
      },
      {
        id: 'bass-drop-d',
        name: 'Drop D (DADg)',
        strings: [
          { name: 'D1', frequency: 36.71 },
          { name: 'A1', frequency: 55.0 },
          { name: 'D2', frequency: 73.42 },
          { name: 'G2', frequency: 98.0 },
        ],
      },
    ],
  },
  {
    id: 'ukulele',
    name: 'Ukulele',
    tunings: [
      {
        id: 'ukulele-standard',
        name: 'Standard (GCEA)',
        strings: [
          { name: 'G4', frequency: 392.0 },
          { name: 'C4', frequency: 261.63 },
          { name: 'E4', frequency: 329.63 },
          { name: 'A4', frequency: 440.0 },
        ],
      },
      {
        id: 'ukulele-low-g',
        name: 'Low G (GCEA)',
        strings: [
          { name: 'G3', frequency: 196.0 },
          { name: 'C4', frequency: 261.63 },
          { name: 'E4', frequency: 329.63 },
          { name: 'A4', frequency: 440.0 },
        ],
      },
      {
        id: 'ukulele-baritone',
        name: 'Baritone (DGBE)',
        strings: [
          { name: 'D3', frequency: 146.83 },
          { name: 'G3', frequency: 196.0 },
          { name: 'B3', frequency: 246.94 },
          { name: 'E4', frequency: 329.63 },
        ],
      },
    ],
  },
  {
    id: 'violin',
    name: 'Violin',
    tunings: [
      {
        id: 'violin-standard',
        name: 'Standard (GDAE)',
        strings: [
          { name: 'G3', frequency: 196.0 },
          { name: 'D4', frequency: 293.66 },
          { name: 'A4', frequency: 440.0 },
          { name: 'E5', frequency: 659.25 },
        ],
      },
    ],
  },
  {
    id: 'mandolin',
    name: 'Mandolin',
    tunings: [
      {
        id: 'mandolin-standard',
        name: 'Standard (GDAE)',
        strings: [
          { name: 'G3', frequency: 196.0 },
          { name: 'D4', frequency: 293.66 },
          { name: 'A4', frequency: 440.0 },
          { name: 'E5', frequency: 659.25 },
        ],
      },
    ],
  },
  {
    id: 'banjo',
    name: 'Banjo',
    tunings: [
      {
        id: 'banjo-standard-5',
        name: 'Standard 5-string (gDGBD)',
        strings: [
          { name: 'G4', frequency: 392.0 },
          { name: 'D3', frequency: 146.83 },
          { name: 'G3', frequency: 196.0 },
          { name: 'B3', frequency: 246.94 },
          { name: 'D4', frequency: 293.66 },
        ],
      },
      {
        id: 'banjo-tenor',
        name: 'Tenor (CGDA)',
        strings: [
          { name: 'C3', frequency: 130.81 },
          { name: 'G3', frequency: 196.0 },
          { name: 'D4', frequency: 293.66 },
          { name: 'A4', frequency: 440.0 },
        ],
      },
    ],
  },
]

export function findInstrument(id: string): Instrument | null {
  return INSTRUMENTS.find((i) => i.id === id) ?? null
}

export function findTuning(instrumentId: string, tuningId: string) {
  return (
    findInstrument(instrumentId)?.tunings.find((t) => t.id === tuningId) ?? null
  )
}
