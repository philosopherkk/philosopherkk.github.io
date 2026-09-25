#!/usr/bin/env bash
# Verify staged Pages artifact does not publish test harnesses.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="${ROOT}/_site"
if [[ ! -d "$STAGE" ]]; then
  echo "missing _site — run scripts/stage-pages.sh first" >&2
  exit 1
fi

fail() { echo "verify-pages-stage: FAIL — $*" >&2; exit 1; }
ok() { echo "verify-pages-stage: $*"; }

[[ -f "$STAGE/index.html" ]] || fail "hub index.html missing"
[[ -f "$STAGE/deid/index.html" ]] || fail "deid/index.html missing"
[[ -f "$STAGE/deid/app.js" ]] || fail "deid/app.js missing"

if [[ -e "$STAGE/deid/tests" ]]; then
  fail "deid/tests must not be in the Pages artifact"
fi
if [[ -e "$STAGE/tests" ]]; then
  fail "tests/ must not be in the Pages artifact"
fi
if [[ -e "$STAGE/ci" ]]; then
  fail "ci/ must not be in the Pages artifact"
fi
if [[ -e "$STAGE/deid/package.json" ]]; then
  fail "deid/package.json (dev) must not be published"
fi

# Simulate 404 for those paths relative to the artifact
for p in deid/tests deid/tests/index.html tests ci/deid-harness; do
  if [[ -e "$STAGE/$p" ]]; then
    fail "path $p unexpectedly present (would not 404)"
  fi
  ok "absent → would 404: /$p"
done

ok "PASS — test trees excluded from Pages stage"
