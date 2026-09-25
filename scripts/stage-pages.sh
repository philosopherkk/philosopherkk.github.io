#!/usr/bin/env bash
# Stage a GitHub Pages artifact that excludes CI/test trees.
# Publishes hub + app folders only (no ci/, no deid/tests, no node_modules).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="${ROOT}/_site"
rm -rf "$STAGE"
mkdir -p "$STAGE"

for f in index.html 404.html README.md AGENTS.md .nojekyll; do
  if [[ -e "$ROOT/$f" ]]; then
    cp -a "$ROOT/$f" "$STAGE/$f"
  fi
done
if [[ -f "$ROOT/scripts/check-hub.sh" ]]; then
  mkdir -p "$STAGE/scripts"
  cp -a "$ROOT/scripts/check-hub.sh" "$STAGE/scripts/"
fi

copy_app() {
  local name="$1"
  local src="$ROOT/$name"
  local dst="$STAGE/$name"
  [[ -d "$src" ]] || return 0
  mkdir -p "$dst"
  # Copy tree while skipping tests / node_modules / package manifests
  (
    cd "$src"
    find . -type f \
      ! -path './tests/*' \
      ! -path './tests' \
      ! -path './node_modules/*' \
      ! -path './node_modules' \
      ! -name 'package.json' \
      ! -name 'package-lock.json' \
      -print0 |
      while IFS= read -r -d '' rel; do
        mkdir -p "$dst/$(dirname "$rel")"
        cp -a "$src/$rel" "$dst/$rel"
      done
  )
}

for app in transit purple outflow waiting marketdesk deid; do
  copy_app "$app"
done

rm -rf "$STAGE/ci" "$STAGE/tests" "$STAGE/deid/tests"

echo "Staged Pages tree at $STAGE"
du -sh "$STAGE" "$STAGE/deid" 2>/dev/null || true
