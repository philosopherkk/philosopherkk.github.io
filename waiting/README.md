# Hong Kong specialist waiting times

Public dashboard of Hospital Authority specialist outpatient new-case waiting times by cluster, the two published elective surgeries (cataract, total joint replacement), investigation caveats, and private hospital fee ranges.

**Live site (GitHub Pages):** https://philosopherkk.github.io/hk-hospital-waiting-times/

## Version

- **Version:** 1.0.0
- **Site last updated:** 2026-09-03
- **HA data period:** 1 Jul 2025 – 30 Jun 2026
- **Waitlist snapshot:** 30 Jun 2026
- **Next HA SOP / elective-surgery file:** 30 Oct 2026
- **Site refresh cadence:** quarterly (30 Jan / 30 Apr / 31 Jul / 30 Oct), matching HA’s open-data calendar

## Language

Toggle **EN / 繁** in the header. Preference is stored in the browser.

## Sources

- [SOP waiting time (English XLSX)](https://www.ha.org.hk/opendata/sop/sop-waiting-time-en.xlsx)
- [Elective cataract surgery](https://www.ha.org.hk/opendata/electivesurgery/elective-cataract-surgery-en.xlsx)
- [Elective total joint replacement](https://www.ha.org.hk/opendata/electivesurgery/elective-total-joint-replacement-surgery-en.xlsx)

HA publishes SOP waits by **cluster**, not by hospital. Only cataract and TJR have official elective-surgery waitlists.

## Update rule

Do not invent weekly or hospital-level SOP waits. Re-download the three HA workbooks each quarter. If the files are unchanged, keep the numbers and stamp the “site updated” date.
