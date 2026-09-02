# Apex Trace — source search report

**Status: NOT FOUND**  
**Date (HKT): 2026-09-02**  
**Agent:** Find and publish Apex Trace  
**Action taken:** Did **not** scaffold a fake Apex Trace app. Did **not** create `apex-trace/` or `apex/` on Pages.

## Verdict

The Grok Built **Apex Trace** project (iRacing telemetry / SimHub / garage / pit wall / analysis / Android pit pad) is **not visible** from this Cloud Agent environment. KK must push the Grok project to GitHub (public or private, granting this agent access) or open the project in Cursor before it can be polished, version-stamped, and published under a new Pages folder.

## Remotes and surfaces searched

### GitHub — `philosopherkk/*` (public)

Listed and cloned shallow copies of all public repos (6):

| Repo | Notes |
|------|--------|
| `philosopherkk/philosopherkk.github.io` | Hub + `outflow/`, `transit/`, `purple/` only. No Apex Trace. |
| `philosopherkk/purple-sectors` | iRacing **weekly board** only — not Apex Trace / SimHub. |
| `philosopherkk/hk-transit` | Transit app. |
| `philosopherkk/dr-poon-ka-kin` | Clinic page. |
| `philosopherkk/eyesinfo` | Eye-education site; has Grok PWA scaffolding (`public/__grok`, `grok-export@…` deploy attempts) — **not** Apex Trace. |
| `philosopherkk/first_app` | Empty / old RoR tutorial. |

Local grep across clones for: `Apex Trace`, `HANDOVER`, `AGENTS.project`, `SimHub`, `pit pad`, `join code`, `vs-record`, `Grok Built`, `beacon` — **no Apex Trace hits** (only unrelated `handOver` helpers in eyesinfo).

### GitHub — likely Apex Trace repo names

Direct `GET /repos/philosopherkk/{name}` → **404** for:

`apex-trace`, `apex`, `apex_trace`, `ApexTrace`, `apex-trace-app`, `simhub-apex`, `grok-apex`, `iracing-telemetry`, `pit-pad`, `pitpad`, `garage-pit-wall`, `outflow-app` (mentioned in README; also 404).

### GitHub — private repos

- GraphQL `user(login: "philosopherkk") { repositories(privacy: PRIVATE) }` → **empty**.
- Authenticated viewer is `cursor[bot]` with **no** private repos of its own.
- Cannot distinguish “no private Apex Trace” from “private repo exists but token cannot see it.” Candidate names still return 404.

### GitHub code search (`user:philosopherkk`)

Successful zero-hit queries (when not rate-limited):

- `filename:AGENTS.project.md`
- `pit pad`

Other queries (`Apex Trace`, `HANDOVER.md`, `SimHub`, `vs-record`, `beacon`) hit secondary rate limits; equivalent coverage came from full local clones of all public repos.

Global public repo name search for “Apex Trace” / `apex-trace` returned only **unrelated** third-party projects (not under `philosopherkk`).

### Live GitHub Pages

- https://philosopherkk.github.io/ — currently Transit-shaped root (separate hub-restore PR exists).
- https://philosopherkk.github.io/apex-trace/ → **404**
- https://philosopherkk.github.io/apex/ → **404**
- Existing folders only: `outflow/`, `transit/`, `purple/`

### Cursor Cloud Agents (this environment)

Only two agents visible:

1. This run — “Find and publish Apex Trace”
2. “Safer GitHub Pages publish” (`bc-caa57904-…`) — hub protect / Outflow SW; **no Apex Trace content**

### Origin (Cursor codebase remotes)

`origin` CLI is installed but **not authenticated** (`Not logged in`). Could not list or search Origin/Cursor codebase repos.

### Gmail (connected)

- SimHub **license** email exists (Mar 2026) — confirms SimHub purchase, not source.
- Grok / Grok Build marketing emails exist.
- **No** thread with Apex Trace source, `HANDOVER.md`, join codes, or pit-pad handover.

### Other MCPs

| Surface | Result |
|---------|--------|
| Vercel (`eyesinfo` team) | **0** projects |
| Coda | `needsAuth` — unreachable |
| Google Calendar | `needsAuth` — unreachable |
| X/Twitter search | No philosopherkk Apex Trace posts |
| Hostinger | Not used (no Hostinger deploy target for this search) |

## Grok Built visibility

Grok Built / `grok-export` activity appears only around **eyesinfo** (Vercel failure from `grok-export@users.noreply.github.com`). No Grok Built Apex Trace repository, export, or handover package is reachable from GitHub, this workspace, Origin, or connected mail.

## What KK should do next

1. Push the Grok Built Apex Trace project to GitHub under `philosopherkk/*` (or grant the Cloud Agent access to the private repo), **or** open the project folder in Cursor Desktop / a Cloud Agent workspace that includes the source.
2. Ensure `HANDOVER.md` and `AGENTS.project.md` are in that repo.
3. Re-run publish: new folder only (`apex-trace/` or `apex/`), version + HKT date stamp, never overwrite root `index.html`, do not touch `outflow/` / `transit/` / `purple/` except a hub link if restoring the hub.

## Non-goals observed

- No fake Apex Trace scaffold created.
- No secrets, SimHub credentials, or live join codes committed.
- Hub root and existing app folders untouched by this report PR.
