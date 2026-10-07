# Synthetic fixtures only

All images in this folder are **generated mocks** with fake identifiers
(`CHAN TAI MAN`, `A123456(7)`, `陳大文`, etc.). They are **not** real patient scans,
clinic reports, or photographs of people.

Regenerate with: `npm --prefix ci/deid run fixtures`

`qr-phi.png` / UI pipeline mocks use the fake string
`PATIENT CHAN TAI MAN HKID A123456(7) DOB 01-03-1980` — not a real patient record.

Round-10 e2e also writes (on demand, not required in git):
- `qr-smudge-src-{50,72,120}.png` — small smudged QR sources
- `cjk-name-png.png` — Chinese fake-name PNG for review-flag gating
