# Agents — publish rules for philosopherkk.github.io

Hong Kong timezone (HKT) for dates and version notes.

## Hard rules

1. **Root `index.html` is the hub only.** Never replace it with Transit, Purple, or Outflow.
2. A change for one app may **only** touch files under that app’s folder:
   - Outflow → `outflow/`
   - HK Transit → `transit/`
   - Purple Sectors → `purple/`
3. **Never commit** Outflow ledger JSON/CSV, vault blobs, or passphrase data. That data is private and on-device only.
4. Open a pull request. Do not merge to `main` yourself unless a human asks.
5. Do not add Face ID or remove Outflow’s passphrase unless restoring a broken publish path requires it.

## Publish loop (one app)

1. Edit **only** that app’s folder (`outflow/`, `transit/`, or `purple/`).
2. Open a PR. Description must list exactly which folders change and the live URLs to open.
3. Merge the PR (human / requested process).
4. Wait **1–2 minutes** for GitHub Pages.
5. Review the matching public URL:
   - https://philosopherkk.github.io/outflow/
   - https://philosopherkk.github.io/transit/
   - https://philosopherkk.github.io/purple/
6. Hub (do not overwrite with an app): https://philosopherkk.github.io/

## Before you push

Run the hub guard locally:

```bash
bash scripts/check-hub.sh
```

It fails if root `index.html` no longer looks like the hub (for example after a Transit publish landed on `/`).

## Outflow service worker

`outflow/sw.js` uses a versioned cache name and **network-first** fetches so deploys are not silently pinned to stale JS. When you change shell assets, bump the `CACHE` string in `sw.js` (and `VERSION` / `VERSION.txt` when shipping a user-visible release).

## Source repos

- Outflow live files are under `outflow/` in this repo (`outflow-app` may 404).
- Transit source: https://github.com/philosopherkk/hk-transit
- Purple source: https://github.com/philosopherkk/purple-sectors
