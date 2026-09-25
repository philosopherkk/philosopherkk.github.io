# Synthetic fixtures only

All images in this folder are **generated mocks** with fake identifiers
(`CHAN TAI MAN`, `A123456(7)`, etc.). They are **not** real patient scans,
clinic reports, or photographs of people.

Regenerate with: `node tests/generate-fixtures.mjs`

`qr-phi.png` is a synthetic QR encoding the fake string
`PATIENT CHAN TAI MAN HKID A123456(7) DOB 01-03-1980` — not a real patient record.
