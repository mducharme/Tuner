# tuner-cli

Chromatic **instrument tuner** in the terminal: live pitch from your microphone, needle-style cents display, and optional string hints. Built with **[tuner-core](https://www.npmjs.com/package/tuner-core)** (detectors + session) and **[decibri](https://www.npmjs.com/package/decibri)** (PortAudio capture).

## Requirements

- **Node.js 20+**
- A **microphone** and an OS where **decibri** can open an input (prebuilt binaries when available; otherwise a local build toolchain may be needed for that package)

## Install

```bash
npm install -g tuner-cli
```

Run **`tuner`** on your `PATH`. To try without a global install:

```bash
npx tuner-cli
```


## Usage

Start the tuner with defaults (guitar, host default input, 48 kHz):

```bash
tuner
```

Discover inputs and built-in instruments:

```bash
tuner --list-devices
tuner --list-instruments
tuner --list-tunings guitar
```

Point at a specific input and instrument:

```bash
tuner --device 1 --instrument bass --tuning bass-standard
tuner --rate 44100 --detector pyin --verbose
```

Use `-h` / `--help` for full CLI text and more examples.

## Options

| Flag | Description |
|------|-------------|
| `-h`, `--help` | Help |
| `-v`, `--verbose` | Print resolved config on **stderr** before audio starts |
| `--list-devices` | List audio inputs |
| `--list-instruments` | List instrument ids |
| `--list-tunings <id>` | List tunings for an instrument |
| `--device …` | Input device: numeric index or substring of the device name |
| `--rate <hz>` | Sample rate (default `48000`) |
| `--instrument <id>` | Instrument (default `guitar`) |
| `--tuning <id>` | Tuning (default: first for that instrument) |
| `--detector <kind>` | `yin`, `pyin`, `mpm`, `autocorrelation` (default `yin`) |
| `--cents-threshold <n>` | In-tune window for the string hint (default `5`) |
| `--style <name>` | `standard`, `colors`, `ansi` |
| `--color <mode>` | `auto`, `always`, `never` (honours `NO_COLOR` / `FORCE_COLOR` when `auto`) |

## Interactive terminal

If stdin and stdout are a TTY, you can change settings without restarting the whole program:

| Key | Action |
|-----|--------|
| **i** | Instrument |
| **t** | Tuning |
| **s** | Display style |
| **a** | Advanced (detector, rate, device, cents, color, style) |
| **q**, **Esc**, **←** | Quit (when no menu is open; in lists, **Esc** / **←** goes back) |
| **Ctrl+C** | Quit |

In lists: **↑** / **↓** (or **j** / **k**) move; **Enter** or **→** (or **l**) select; **Esc** or **←** (or **h**) cancel. Changing detector, rate, or device in **Advanced** restarts the audio stream.

## Developing

This package lives in the **[Tuner](https://github.com/mducharme/Tuner)** monorepo.

```bash
git clone https://github.com/mducharme/Tuner.git
cd Tuner
pnpm install
pnpm dev:cli          # run from source via tsx
pnpm --filter tuner-cli build
pnpm --filter tuner-cli test
pnpm --filter tuner-cli run package:assert
```

Releases and versioning are handled in the monorepo (see the root **README** and [CHANGELOG](../../CHANGELOG.md)).

## License

MIT — see [LICENSE](./LICENSE).
