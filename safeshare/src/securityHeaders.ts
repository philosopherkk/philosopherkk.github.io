/** SPEC §9. Keep this string identical in index.html and public/_headers. */
export const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"

export const REFERRER_POLICY = 'no-referrer'

/** Camera only for this origin. */
export const PERMISSIONS_POLICY = 'camera=(self)'
