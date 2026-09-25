# Scan De-identifier / 影像去識別化

On-device de-identification for ophthalmic imaging reports.
**Nothing is uploaded.** Vendored OCR + PDF libraries only.

Live: https://philosopherkk.github.io/deid/

## Privacy

- 100% client-side; strict CSP (`default-src 'self'`, `wasm-unsafe-eval` only for WASM).
- No analytics, no third-party CDNs at runtime.
- Images stay in memory; never written to `localStorage` / IndexedDB.
- Service worker caches app shell only, never user files.

## Disclaimer

Automated aid only. Always check the result yourself before sharing.
Not a certified de-identification tool.

## Supported layouts

Topcon Maestro, Topcon letterhead, NIDEK RS-3000, Zeiss HFA SFA, Pentacam Holladay / AXL / screen / cataract, Cirrus ONH/RNFL+GCL, AL-Scan, Tecnis toric, plus generic fallback.

## Develop

```bash
# from repo root
python3 -m http.server 8080
# open http://127.0.0.1:8080/deid/

cd deid && npm install && npm test
```

See [PORTING.md](./PORTING.md) for the core module API.
