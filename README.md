# Tuner

Open-source monorepo for instrument tuning: reusable pitch logic and a terminal chromatic tuner.

## tuner-core

[**`tuner-core`**](packages/tuner-core) is an ESM-only library (Node 20+) for pitch detection — YIN, pYIN, MPM, and autocorrelation — plus session/types you can embed in other apps or CLIs. See the [package README](packages/tuner-core/README.md) for API details.

## tuner-cli

[**`tuner-cli`**](packages/tuner-cli) is the terminal instrument tuner. It builds on `tuner-core` and uses [decibri](https://www.npmjs.com/package/decibri) / PortAudio for microphone capture. See the [package README](packages/tuner-cli/README.md) for install and usage.

## Scripts

- `pnpm dev:cli` / `pnpm tuner` — Start tuning in your terminal
- `pnpm build` / `pnpm test` / `pnpm test:coverage` / `pnpm typecheck` / `pnpm lint` — workspaces

## Changelog

Release history: [CHANGELOG.md](./CHANGELOG.md).

## License

MIT — see [LICENSE](./LICENSE).

## Security

See [SECURITY.md](./SECURITY.md).
