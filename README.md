# philosopherkk.github.io

Personal GitHub Pages site. Root `/` is a minimal stub — not a product hub and not any of the apps below.

Apps are separate sites in their own folders:

| Site | Folder | URL |
|---|---|---|
| Outflow (budget) | `outflow/` | https://philosopherkk.github.io/outflow/ |
| HK Transit | `transit/` | https://philosopherkk.github.io/transit/ |
| Purple Sectors | `purple/` | https://philosopherkk.github.io/purple/ |

Root: https://philosopherkk.github.io/

## Agent / publish loop

1. Edit **only** the app folder (`outflow/`, `transit/`, or `purple/`).
2. Open a PR → merge.
3. Wait 1–2 minutes for GitHub Pages.
4. Review the matching public URL above.

Never publish Transit, Purple, or Outflow to `/`. Do not turn root into a three-app suite index.

Before pushing, run:

```bash
bash scripts/check-hub.sh
```

Full rules for coding agents: [AGENTS.md](./AGENTS.md).

## Private data

Never commit Outflow ledger JSON/CSV, vault files, or passphrase material. Ledgers stay on-device only.

## Source repos

- https://github.com/philosopherkk/outflow-app (may be private; live static shell is published under `outflow/` here)
- https://github.com/philosopherkk/hk-transit
- https://github.com/philosopherkk/purple-sectors
