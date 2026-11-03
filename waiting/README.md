# Hong Kong specialist waiting times

Public dashboard of Hospital Authority specialist outpatient new-case waiting times by cluster, the two published elective surgeries (cataract, total joint replacement), investigation caveats, and private hospital fee ranges.

**Live site:** https://philosopherkk.github.io/waiting/

**Work repo:** https://github.com/philosopherkk/hk-hospital-waiting-times


## Version

- **Version:** 1.2.0
- **Site last updated:** 2026-11-03
- **HA data period:** 1 Oct 2025 – 30 Sep 2026
- **Waitlist snapshot:** 30 Sep 2026
- **Next HA SOP / elective-surgery file:** 29 Jan 2027
- **Site refresh cadence:** quarterly (30 Jan / 30 Apr / 31 Jul / 30 Oct), matching HA’s open-data calendar

## Trend charts

### New-case SOP waits tab

Responsive **small-multiples grid** (eight specialties): stable new-case **median weeks** across **13** overlapping HA reporting periods (Oct 2022 → Sep 2026), embedded from [data.gov.hk](https://data.gov.hk) historical snapshots of `sop-waiting-time-en.json`. The sidebar **cluster** filter applies to every panel (territory-worst line when **All clusters**; one cluster when selected). The **specialty** dropdown still drives KPIs and the cluster table. Historical JSON did not include stable P90 weeks — latest P90 stays in the table only.

### Elective surgery tab

**Cataract** and **total joint replacement** each show two SVG trends from **21** monthly data.gov.hk archive snapshots (Feb 2022 → Oct 2026) of the HA elective-surgery JSON files:

- **Waitlist** (HA Overall row when All clusters; cluster row when filtered)
- **Completed-case median wait** (months; territory-worst across clusters when All clusters)

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

Do not invent weekly or hospital-level SOP waits. Re-download the three HA workbooks each quarter. If the files are unchanged, keep the numbers and stamp the “site updated” date. Refresh embedded SOP/CAT/TJR history from data.gov.hk historical-archive when quarterly data lands.
