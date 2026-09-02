# Agents — publish rules for philosopherkk.github.io

Hong Kong timezone (HKT) for dates and version notes.

## Hard rules

1. **Root `index.html` is the hub only.** Never replace it with Transit, Purple, Outflow, EyesInfo, or Apex Trace. It is a page of **links**.
2. A change for one GitHub Pages app may **only** touch files under that app’s folder:
   - Outflow → `outflow/`
   - HK Transit → `transit/`
   - Purple Sectors → `purple/`
   - HA waiting times → `waiting/`
3. **EyesInfo** lives at https://eyesinfo.org (work: https://github.com/philosopherkk/eyesinfo). This hub **links out only** — do not copy that site here; do not edit that repo from a github.io task.
4. **Simracing web — Apex Trace** is **PENDING** until KK resends the handoff. Do not scaffold a fake app, folder, or placeholder (`/apex/`, `/simracing/`, etc.). Not the same project as Purple Sectors.
5. **Never commit** Outflow ledger JSON/CSV, vault blobs, or passphrase data. That data is private and on-device only.
6. Open a pull request. Do not merge to `main` yourself unless a human asks.
7. Do not add Face ID or remove Outflow’s passphrase unless restoring a broken publish path requires it.

## Hub projects (order on the hub)

1. EyesInfo — https://eyesinfo.org
2. HK Transit — https://philosopherkk.github.io/transit/
3. Purple Sectors — https://philosopherkk.github.io/purple/
4. Apex Trace — PENDING (no live URL)
5. Outflow — https://philosopherkk.github.io/outflow/
6. HA waiting times — https://philosopherkk.github.io/waiting/

## Publish loop (one Pages app)

1. Edit **only** that app’s folder (`outflow/`, `transit/`, or `purple/`).
2. Open a PR. Description must list exactly which folders change and the live URLs to open.
3. Merge the PR (human / requested process).
4. Wait **1–2 minutes** for GitHub Pages.
5. Review the matching public URL above.
6. Hub (do not overwrite with an app): https://philosopherkk.github.io/

Hub-only PRs may update root `index.html`, `README.md`, `AGENTS.md`, and `scripts/check-hub.sh` — never the app folders.

## Before you push

Run the hub guard locally:

```bash
bash scripts/check-hub.sh
```

It fails if root `index.html` no longer looks like the hub (for example after a Transit publish landed on `/`).

## Outflow service worker

`outflow/sw.js` uses a versioned cache name and **network-first** fetches so deploys are not silently pinned to stale JS. When you change shell assets, bump the `CACHE` string in `sw.js` (and `VERSION` / `VERSION.txt` when shipping a user-visible release).

## Source repos

- EyesInfo: https://github.com/philosopherkk/eyesinfo (external live site; not on github.io)
- Transit: https://github.com/philosopherkk/hk-transit
- Purple: https://github.com/philosopherkk/purple-sectors
- Apex Trace: PENDING
- Outflow live files are under `outflow/` in this repo (`outflow-app` may 404)
- HA waiting times: https://github.com/philosopherkk/hk-hospital-waiting-times
