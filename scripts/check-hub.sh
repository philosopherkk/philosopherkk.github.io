#!/usr/bin/env bash
# Guard: root index.html must stay a minimal personal stub — never an app shell
# and never a three-app hub that lists Outflow / Transit / Purple as a suite.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INDEX="$ROOT/index.html"

fail() {
  echo "check-hub: FAIL — $*" >&2
  exit 1
}

[[ -f "$INDEX" ]] || fail "missing root index.html"

# Root should identify philosopherkk (personal stub), not an app product name alone.
grep -Eqi 'philosopherkk' "$INDEX" || fail "root index.html should identify philosopherkk"

# Root must NOT be a three-app suite hub.
suite_hits=0
for path in './outflow/' './transit/' './purple/'; do
  if grep -Fq "$path" "$INDEX"; then
    suite_hits=$((suite_hits + 1))
  fi
done
if [[ "$suite_hits" -ge 2 ]]; then
  fail "root index.html must not list/link Outflow, Transit, and Purple as a suite hub"
fi

# Detect common clobber patterns from the three apps.
if grep -Eqi 'Plan shortest|id="planBtn"|HK Transit — shortest' "$INDEX"; then
  fail "root index.html looks like HK Transit — do not publish transit to /"
fi

if grep -Eqi 'Create passphrase|outflow\.v[0-9]|id="unlockPass"' "$INDEX"; then
  fail "root index.html looks like Outflow — do not publish outflow to /"
fi

if grep -Eqi 'Purple Sectors — Weekly|id="weekFlip"|Today’s issue|Today&#39;s issue' "$INDEX"; then
  fail "root index.html looks like Purple Sectors — do not publish purple to /"
fi

# Transit leftovers at repo root usually mean a bad publish path.
for leftover in app-loader.js c5.js c6.js extra.css; do
  if [[ -e "$ROOT/$leftover" ]]; then
    fail "unexpected Transit leftover at repo root: $leftover (keep Transit under transit/ only)"
  fi
done

echo "check-hub: OK — root index.html is a personal stub (not an app, not a suite hub)"
