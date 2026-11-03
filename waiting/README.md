# Hong Kong specialist waiting times

Public dashboard of Hospital Authority specialist outpatient new-case waiting times by cluster, the two published elective surgeries (cataract, total joint replacement), investigation caveats, and private hospital fee ranges.

**Live site:** https://philosopherkk.github.io/waiting/

**Work repo:** https://github.com/philosopherkk/hk-hospital-waiting-times


## Version

- **Version:** 1.3.0
- **Site last updated:** 2026-11-03
- **HA data period:** 1 Oct 2025 – 30 Sep 2026
- **Waitlist snapshot:** 30 Sep 2026
- **Next HA SOP / elective-surgery file:** 29 Jan 2027
- **Site refresh cadence:** quarterly (30 Jan / 30 Apr / 31 Jul / 30 Oct), matching HA’s open-data calendar

## Trend charts

### New-case SOP waits tab

Responsive **small-multiples grid** (eight specialties): stable new-case **median weeks** (or **90th percentile** when historical data exists) across **13** overlapping HA reporting periods (Oct 2022 → Sep 2026), embedded from [data.gov.hk](https://data.gov.hk) historical snapshots of `sop-waiting-time-en.json`. **Each panel plots all seven clusters** as separate series (territory-worst dashed line when **All clusters** is selected). A **Median | 90th percentile** control sits above the grid; on the SOP tab the 90th option is disabled because archive JSON did not include stable P90 weeks — latest P90 stays in the table only. Sidebar **cluster** selection **highlights** one series; **specialty** still drives KPIs and the cluster table.

### Elective surgery tab

**Cataract** and **total joint replacement** each show two SVG trends from **21** monthly data.gov.hk archive snapshots (Feb 2022 → Oct 2026):

- **Waitlist** — all clusters plus HA **Overall** (dashed)
- **Completed-case wait** (months) — all clusters; **Median | 90th percentile** uses real per-cluster `median` / `p90` arrays in the embedded history

The same **Median | 90th** control is mirrored above the surgery trends (shared preference in `localStorage`). Sidebar cluster highlights one series on each chart.

Latest-quarter tables remain below each chart pair.

**CAT/TJR archive caveats:** Monthly archive timestamps do not match SOP’s thirteen rolling periods exactly. The first two snapshots both report the same 2021-12 period. No investigation or private-fee time series are embedded (HA does not publish comparable quarterly series).

## Language

Toggle **EN / 繁** in the header. Preference is stored in the browser.

## Sources

- [SOP waiting time (English XLSX)](https://www.ha.org.hk/opendata/sop/sop-waiting-time-en.xlsx)
- [Elective cataract surgery](https://www.ha.org.hk/opendata/electivesurgery/elective-cataract-surgery-en.xlsx)
- [Elective total joint replacement](https://www.ha.org.hk/opendata/electivesurgery/elective-total-joint-replacement-surgery-en.xlsx)

HA publishes SOP waits by **cluster**, not by hospital. Only cataract and TJR have official elective-surgery waitlists.

## Update rule

Do not invent weekly or hospital-level SOP waits. Re-download the three HA workbooks each quarter. If the files are unchanged, keep the numbers and stamp the “site updated” date. Refresh embedded SOP/CAT/TJR history from data.gov.hk historical-archive when quarterly data lands. When stable P90 weeks appear in historical SOP JSON, embed them in `HISTORY.sop.*.stableP90Weeks` — the 90th control on the SOP tab will enable automatically.
