# Outflow

Local-first income / outflow ledger. **Version 2.1.10 · 2026-09-30.**

**Live (public):** https://philosopherkk.github.io/outflow/

**Source of truth:** this private repo (`philosopherkk/outflow-app`). The github.io `/outflow/` folder is a publish mirror only.

**History:** [`CHANGELOG.md`](./CHANGELOG.md) (git commit SHAs only). In the app, **History** opens that file on GitHub. Vault / ledger data is never in git.

## Edit and deploy

1. Branch from `main`: `feat/…` or `chore/…` (never commit on `main`).
2. Edit app files here (`index.html`, `app.js`, `styles.css`, `sw.js`, etc.).
3. **Every publish / release:** bump `VERSION.txt` and matching stamps (`app.js`, `sw.js` cache, `manifest.webmanifest`, `index.html`), then append a git-sourced entry to `CHANGELOG.md` (real commit SHAs). Do not invent a version newer than what KK approved.
4. Open a PR into this repo. Review and merge to `main`.
5. **Publish:** copy the approved tree into `philosopherkk/philosopherkk.github.io` under `outflow/` via a separate PR on that repo. GitHub Pages serves the live URL from that mirror.
6. After the Pages PR merges: hard-refresh https://philosopherkk.github.io/outflow/ and confirm the footer matches `VERSION.txt` on this repo’s `main`.

Do not treat chat pastebacks, editor buffers, or the github.io tree as the project. Accepted changes land here first.

## What stays on device

- Face ID / device biometrics unlock (no password).
- Ledger and vault data live in the browser (`localStorage`) on that phone/computer.
- JSON backup / restore is local-only — **never commit** vault, ledger, CSV, or spreadsheet exports.

See `.gitignore`. If a backup file appears in a PR, reject it.

## App files

| File | Role |
|---|---|
| `index.html` | Shell / UI (version stamp + History link) |
| `app.js` | Ledger logic, FX, biometrics, backup |
| `styles.css` | Theme / layout |
| `sw.js` | Service worker shell cache |
| `manifest.webmanifest` | PWA install |
| `icon.svg` | Icon |
| `VERSION.txt` | Version stamp |
| `CHANGELOG.md` | Git-sourced edit/upload history |
| `404.html` | Pages 404 |

## Agents

Standing rules for automated editors: see [`AGENTS.md`](./AGENTS.md).
