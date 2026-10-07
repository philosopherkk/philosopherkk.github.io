# CHANGELOG — Smart money 使錢靈

Git-sourced history for this app. Entries follow commits on this private repo (`philosopherkk/outflow-app`), not chat notes.

**Vault / ledger data is never in git history.** Face ID secrets, `localStorage` ledgers, and JSON/CSV backups stay on-device. Do not commit them.

Live mirror: https://philosopherkk.github.io/outflow/ (publish copy only).

## [2.1.12] — 2026-10-07

- **Summary:** UX review fixes (usability + accessibility)
- **Notes:** Recurring tab lists every recurring row (no 6-cap), overdue first in red, with **Paid** (logs a copy dated today, advances next due by its interval) and Edit. Add/edit sheet is a native `<dialog>` (backdrop, Escape, focus to Amount, focus returns). Labels tied to inputs; search/filter/chip groups labelled; chips expose `aria-pressed`; dock `aria-current`; toast is a live region with an Undo action (delete, Paid, import, erase). User text escaped before rendering. Import asks before replacing existing rows and is undoable. Next due hidden for one-time rows and defaults to date + interval. 44px tap targets, whole list rows open edit, `:focus-visible` ring, small text ≥ .8rem. Desktop: content capped at 560px, sheet centred ≥ 900px. Shorter version line; Add-to-Home-Screen banner only on iOS Safari outside standalone, dismissal remembered. Amount step 0.01; FAB labelled "Add outflow". Ledger format and `localStorage` keys unchanged.

## [2.1.11] — 2026-10-01

- **Commit:** `d1be133` (`d1be133180014656e06df3c78f5d3369d174b544`)
- **Summary:** Rename app to Smart money 使錢靈
- **Notes:** User-facing title, PWA `name` / `short_name`, Face ID relying party, and version stamps. Expense rows still labeled Outflow; ledger `localStorage` keys and `/outflow/` URL unchanged.

## [2.1.10] — 2026-09-30

- **Commit:** `cad1e8d` (`cad1e8d4d5a7b973a7731abb6f926a2718b9f93d`)
- **Summary:** Group home list by date; delete only on the edit sheet
- **Notes:** Home rows group by date only. List rows keep Edit. Delete is on the edit sheet (`cccaf3a` / `cccaf3a96352c2e3e13ba15f1fc6294f55ab1e6e`). Version stamps: `VERSION.txt`, `app.js`, `sw.js` cache, `manifest.webmanifest`, `index.html`.

## [2.1.9] — 2026-09-20

- **Commit:** `88588c8` (`88588c883fdcb23cf8412c2ee0d5c121a0f285f1`)
- **Summary:** Restore JPY as a usable currency
- **Notes:** Added `JPY` to `CODES`, `FALLBACK_FX` rates/`hkdPer`, live FX parse (`open.er-api.com`), and the currency `<select>`. FX detail table already iterates `CODES`. Base remains HKD. Version stamps: `VERSION.txt`, `app.js`, `sw.js` cache, `manifest.webmanifest`, `index.html`.

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
