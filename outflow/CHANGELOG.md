# CHANGELOG — Outflow

Git-sourced history for this app. Entries follow commits on this private repo (`philosopherkk/outflow-app`), not chat notes.

**Vault / ledger data is never in git history.** Face ID secrets, `localStorage` ledgers, and JSON/CSV backups stay on-device. Do not commit them.

Live mirror: https://philosopherkk.github.io/outflow/ (publish copy only).

## [2.1.8] — 2026-09-19

- **Commit:** `0e87dec` (`0e87decf327b60eb02628c41636c6450bc012e74`)
- **Summary:** git CHANGELOG + History link
- **Notes:** Version stamp kept; Settings/home History link opens this file on GitHub. AGENTS/README: every publish bumps `VERSION.txt` and updates this CHANGELOG from the commit, then syncs to github.io `/outflow/` via a separate PR.

## [2.1.7] — 2026-09-19 (app stamp 2026-09-04)

- **Commit:** `747f320` (`747f32071b25ee161a3c888a456de9a013865d81`)
- **Summary:** Import live Outflow 2.1.7 as canonical source of truth (#3)
- **Notes:** Brought `app.js`, `styles.css`, and shell files from the github.io `/outflow/` mirror into this repo. Intermediate live builds after 1.4.2 (through 2.1.6) lived only on the mirror and are not separate commits here. No vault/ledger data in the import.

## [1.4.2] — 2026-09-02

- **Commit:** `ff780d3` (`ff780d3ac152d44542d4a5c992453886ecf5d3fe`) — version bump; follow-ups `8b30b2f`, `bf1a0a6`, `d9ca8fc`, `9bb5cd4`, `f01285c`
- **Summary:** iPhone Safari / Add to Home Screen shell notes; cache `app.js`; Pages entry; live site pointed at separated `/outflow/` URL

## [1.4.1] — 2026-09-02

- **Commit:** `e980a44` (`e980a44175ba5f966a4cd74095449a929da0522c`)
- **Summary:** iPhone Safari shell — icons, service worker, README (app HTML next)

## [1.3.0] — 2026-08-31

- **Commit:** `5ecba82` (`5ecba820f6eb06992fece8581e678e1c9c5137fa`)
- **Summary:** Stamp metadata and service worker (`VERSION.txt` introduced)

## Earlier (pre-version stamp)

- **Commit:** `60e681e` (`60e681eed730bfd190265515b7a06a01da024ced`) — Charts tab for yearly, monthly, and daily outflow (2026-08-31)
- **Commit:** `5e9dba8` (`5e9dba8ea83bb38e8ac40cf944d78a94e59bf141`) — Outflow PWA shell (no ledger data) (2026-08-31)
- **Commit:** `4689685` (`46896857d653365792d126e9c9e2460d718defef`) — Initial commit (2026-08-31)
