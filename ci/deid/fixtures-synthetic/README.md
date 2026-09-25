# Synthetic fixtures only (CI — not published to GitHub Pages)

All images in this folder are **generated mocks** with fake identifiers
(`CHAN TAI MAN`, `A123456(7)`, etc.). They are **not** real patient scans,
clinic reports, or photographs of people.

Regenerate with: `npm --prefix ci/deid run fixtures`

`qr-phi.png` / UI pipeline mocks use the fake string
`PATIENT CHAN TAI MAN HKID A123456(7) DOB 01-03-1980` — not a real patient record.
