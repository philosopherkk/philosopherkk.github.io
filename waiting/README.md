# Hong Kong specialist waiting times

Public dashboard of Hospital Authority specialist outpatient new-case waiting times by cluster, the two published elective surgeries (cataract, total joint replacement), investigation caveats, and private hospital fee ranges.

**Live site:** https://philosopherkk.github.io/waiting/

**Work repo:** https://github.com/philosopherkk/hk-hospital-waiting-times


## Version

- **Version:** 1.1.0
- **Site last updated:** 2026-11-03
- **HA data period:** 1 Oct 2025 – 30 Sep 2026
- **Waitlist snapshot:** 30 Sep 2026
- **Next HA SOP / elective-surgery file:** 29 Jan 2027
- **Site refresh cadence:** quarterly (30 Jan / 30 Apr / 31 Jul / 30 Oct), matching HA’s open-data calendar

## Trend charts (SOP)

The **New-case SOP waits** tab includes an SVG line chart of **stable new-case median weeks** across **13 quarterly HA releases** (Oct 2022 → Sep 2026). Data is embedded from [data.gov.hk](https://data.gov.hk) historical snapshots of `sop-waiting-time-en.json` (same series as the live HA open-data JSON). Pick a **specialty** and **cluster** in the sidebar: with **All clusters**, the chart shows the territory-worst (max) stable median per period; with one cluster selected, that cluster’s median trend. Historical JSON in this embed did not include stable P90 weeks, so P90 overlay stays disabled until a future quarterly embed adds it. Elective surgery (cataract / TJR) charts are not embedded yet—only the latest quarter on the surgery tab.

## Language

Toggle **EN / 繁** in the header. Preference is stored in the browser.

## Sources

- [SOP waiting time (English XLSX)](https://www.ha.org.hk/opendata/sop/sop-waiting-time-en.xlsx)
- [Elective cataract surgery](https://www.ha.org.hk/opendata/electivesurgery/elective-cataract-surgery-en.xlsx)
- [Elective total joint replacement](https://www.ha.org.hk/opendata/electivesurgery/elective-total-joint-replacement-surgery-en.xlsx)

HA publishes SOP waits by **cluster**, not by hospital. Only cataract and TJR have official elective-surgery waitlists.

## Update rule

Do not invent weekly or hospital-level SOP waits. Re-download the three HA workbooks each quarter. If the files are unchanged, keep the numbers and stamp the “site updated” date.
