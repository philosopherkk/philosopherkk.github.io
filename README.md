# philosopherkk.github.io

Hub only — root `index.html` is a page of **links**. Never dump an app into `/`.

| # | Project | Folder / host | Live | Work repo |
|---|---|---|---|---|
| 1 | EyesInfo (護眼學堂) | external only | https://eyesinfo.org | https://github.com/philosopherkk/eyesinfo |
| 2 | HK Transit | `transit/` | https://philosopherkk.github.io/transit/ | https://github.com/philosopherkk/hk-transit |
| 3 | Purple Sectors | `purple/` | https://philosopherkk.github.io/purple/ | https://github.com/philosopherkk/purple-sectors |
| 4 | Simracing web — Apex Trace | *none yet* | **PENDING** | PENDING until KK handoff |
| 5 | Outflow | `outflow/` | https://philosopherkk.github.io/outflow/ | https://github.com/philosopherkk/outflow-app (private; may 404) |
| 6 | HA waiting times | `waiting/` | https://philosopherkk.github.io/waiting/ | https://github.com/philosopherkk/hk-hospital-waiting-times |

Hub: https://philosopherkk.github.io/

## Hard rules

- Root is hub only. Each GitHub Pages app stays in its own folder (`transit/`, `purple/`, `outflow/`, `waiting/`).
- EyesInfo: hub links out only. Do **not** copy eyesinfo.org onto this repo.
- Apex Trace: no scaffold, no `/apex/` or `/simracing/` placeholder until handoff.
- Never commit Outflow ledger JSON/CSV, vault files, or passphrase material.

## Agent / publish loop (one Pages app)

1. Edit **only** that app’s folder (`outflow/`, `transit/`, or `purple/`).
2. Open a PR → merge (human).
3. Wait 1–2 minutes for GitHub Pages.
4. Review the matching public URL above.

Hub-only changes edit root hub files (`index.html`, this README, `AGENTS.md`, `scripts/check-hub.sh`) — not the app folders.

Before pushing, run:

```bash
bash scripts/check-hub.sh
```

Full rules for coding agents: [AGENTS.md](./AGENTS.md).
