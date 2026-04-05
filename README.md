# Tuner

Open-source monorepo: **`tuner-core`** (pitch detection + session) and **`tuner-cli`** (terminal tuner).


## Scripts

- `pnpm dev:cli` / `pnpm tuner` — CLI
- `pnpm build` / `pnpm test` / `pnpm test:coverage` / `pnpm typecheck` / `pnpm lint` — workspaces

## Git hooks (Husky)

After `pnpm install`, hooks run via **`prepare`**:

- **pre-commit** — `pnpm typecheck` (fast type safety before each commit)
- **pre-push** — `pnpm lint` then `pnpm test` (full check before pushing)

To skip once: `HUSKY=0 git commit` (macOS/Linux), `$env:HUSKY='0'; git commit` (PowerShell), or `set HUSKY=0 && git commit` (cmd).

## License

MIT — see [LICENSE](./LICENSE).

## Publishing `tuner-core`

- [CHANGELOG.md](./CHANGELOG.md) — version history.
- [packages/tuner-core/README.md](./packages/tuner-core/README.md) — npm usage (ESM-only).
- CI runs **publint** + **Are The Types Wrong?** (`esm-only`) via `pnpm --filter tuner-core run package:assert`.
- GitHub Actions: [`.github/workflows/publish.yml`](./.github/workflows/publish.yml) — run **Publish** with the package to ship (CalVer bump, changelog, GitHub Release, npm). Set the `NPM_TOKEN` secret. Repo: [github.com/mducharme/Tuner](https://github.com/mducharme/Tuner).

## Security

See [SECURITY.md](./SECURITY.md).
