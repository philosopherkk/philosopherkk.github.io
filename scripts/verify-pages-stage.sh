#!/usr/bin/env bash
# Verify staged Pages artifact:
# 1) excludes ci/ / tests / package manifests
# 2) retains every currently-published tracked file from origin/main
#    (same publish filter as stage-pages.sh)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="${ROOT}/_site"
if [[ ! -d "$STAGE" ]]; then
  echo "missing _site — run scripts/stage-pages.sh first" >&2
  exit 1
fi

fail() { echo "verify-pages-stage: FAIL — $*" >&2; exit 1; }
ok() { echo "verify-pages-stage: $*"; }

should_publish() {
  local f="$1"
  case "$f" in
    ci|ci/*) return 1 ;;
    .github|.github/*) return 1 ;;
    */node_modules|*/node_modules/*|node_modules|node_modules/*) return 1 ;;
    package.json|package-lock.json|*/package.json|*/package-lock.json) return 1 ;;
    _site|_site/*) return 1 ;;
  esac
  return 0
}

[[ -f "$STAGE/index.html" ]] || fail "hub index.html missing"
[[ -f "$STAGE/favicon.svg" ]] || fail "hub favicon.svg missing (live hub asset)"
[[ -f "$STAGE/oculens-p/index.html" ]] || fail "oculens-p/index.html missing (live at /oculens-p/)"
[[ -f "$STAGE/deid/index.html" ]] || fail "deid/index.html missing"
[[ -f "$STAGE/deid/app.js" ]] || fail "deid/app.js missing"

if [[ -e "$STAGE/deid/tests" ]]; then fail "deid/tests must not be in the Pages artifact"; fi
if [[ -e "$STAGE/tests" ]]; then fail "tests/ must not be in the Pages artifact"; fi
if [[ -e "$STAGE/ci" ]]; then fail "ci/ must not be in the Pages artifact"; fi
if [[ -e "$STAGE/deid/package.json" ]]; then fail "deid/package.json (dev) must not be published"; fi
if [[ -e "$STAGE/.github" ]]; then fail ".github/ must not be in the Pages artifact"; fi

for p in deid/tests tests ci/deid-harness .github/workflows; do
  if [[ -e "$STAGE/$p" ]]; then
    fail "path $p unexpectedly present (would not 404)"
  fi
  ok "absent → would 404: /$p"
done

# Ensure we did not drop anything that is already live on main under the same filter.
git -C "$ROOT" fetch origin main --quiet 2>/dev/null || true
REF="origin/main"
if ! git -C "$ROOT" rev-parse --verify "$REF" >/dev/null 2>&1; then
  REF="main"
fi

missing=0
while IFS= read -r f; do
  [[ -n "$f" ]] || continue
  should_publish "$f" || continue
  if [[ ! -f "$STAGE/$f" ]]; then
    echo "verify-pages-stage: MISSING from stage (present on $REF): $f" >&2
    missing=$((missing + 1))
  fi
done < <(git -C "$ROOT" ls-tree -r --name-only "$REF")

if [[ "$missing" -gt 0 ]]; then
  fail "$missing tracked published file(s) from $REF missing from stage"
fi
ok "all publishable tracked files from $REF are present in stage"

ok "PASS — Pages stage is complete and excludes CI/dev trees"
