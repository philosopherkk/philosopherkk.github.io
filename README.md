# philosopherkk.github.io

Hub only. Three apps live in separate folders so they cannot overwrite each other.

| App | Folder | URL |
|---|---|---|
| Outflow (budget) | `outflow/` | https://philosopherkk.github.io/outflow/ |
| HK Transit | `transit/` | https://philosopherkk.github.io/transit/ |
| Purple Sectors | `purple/` | https://philosopherkk.github.io/purple/ |

Hub: https://philosopherkk.github.io/

## Agent / publish loop

1. Edit **only** the app folder (`outflow/`, `transit/`, or `purple/`).
2. Open a PR → merge.
3. Wait 1–2 minutes for GitHub Pages.
4. Review the matching public URL above.

Root `index.html` must stay the hub. Never publish Transit, Purple, or Outflow to `/`.

Before pushing, run:

```bash
bash scripts/check-hub.sh
```

Full rules for coding agents: [AGENTS.md](./AGENTS.md).

## Private data

Never commit Outflow ledger JSON/CSV, vault files, or passphrase material. Ledgers stay on-device only.

## Source repos

- https://github.com/philosopherkk/outflow-app (may 404; live files are in `outflow/` here)
- https://github.com/philosopherkk/hk-transit
- https://github.com/philosopherkk/purple-sectors
