#!/usr/bin/env node
import process from 'node:process'
import { listAudioDevices, listInstruments, listTunings } from './cli-lists.js'
import { createCliCommand, parseCliRuntime } from './parse-args.js'
import type { ParsedCli } from './parsed-cli.js'
import { runTunerSession } from './run-tuner-session.js'

/** Full help including `addHelpText('after', …)` (not just `helpInformation()`). */
function printProgramHelp(): void {
  const cmd = createCliCommand()
  const parts: string[] = []
  cmd.configureOutput({
    writeOut: (s) => parts.push(s),
    writeErr: (s) => parts.push(s),
  })
  cmd.outputHelp()
  process.stdout.write(parts.join(''))
}

async function main(): Promise<void> {
  let parsed: ParsedCli
  try {
    parsed = parseCliRuntime(process.argv)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(msg)
    printProgramHelp()
    process.exitCode = 1
    return
  }

  if (parsed.kind === 'help') {
    printProgramHelp()
    return
  }

  if (parsed.kind === 'list-devices') {
    listAudioDevices()
    return
  }

  if (parsed.kind === 'list-instruments') {
    listInstruments()
    return
  }

  if (parsed.kind === 'list-tunings') {
    if (!listTunings(parsed.instrumentId)) {
      process.exitCode = 1
    }
    return
  }

  await runTunerSession(parsed.args)
}

void main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exitCode = 1
})
