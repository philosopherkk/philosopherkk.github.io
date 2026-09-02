#!/usr/bin/env bash
# Guard: root index.html must remain the hub, not an app shell.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INDEX="$ROOT/index.html"

fail() {
  echo "check-hub: FAIL — $*" >&2
  exit 1
}

[[ -f "$INDEX" ]] || fail "missing root index.html"

# Hub must list the three GitHub Pages app entry points (paths or full URLs).
for path in 'transit/' 'purple/' 'outflow/' 'waiting/'; do
  grep -Fq "$path" "$INDEX" || fail "root index.html must link to $path"
done

# External / pending projects should appear as labeled hub cards.
grep -Eqi 'EyesInfo' "$INDEX" || fail "root index.html must list EyesInfo"
grep -Eqi 'eyesinfo\.org' "$INDEX" || fail "root index.html must link out to eyesinfo.org"
grep -Eqi 'Apex Trace' "$INDEX" || fail "root index.html must list Apex Trace"
grep -Eqi 'PENDING' "$INDEX" || fail "root index.html must mark Apex Trace as PENDING"

# Title / branding should read as the hub.
grep -Eqi 'philosopherkk' "$INDEX" || fail "root index.html should identify philosopherkk hub"
grep -Eqi 'hub only|links only|this hub' "$INDEX" || fail "root index.html should state hub-only rule"

# Detect common clobber patterns from the three apps.
if grep -Eqi 'Plan shortest|id="planBtn"|HK Transit — shortest' "$INDEX"; then
  fail "root index.html looks like HK Transit — restore the hub (do not publish transit to /)"
fi

if grep -Eqi 'Create passphrase|outflow\.v[0-9]|id="unlockPass"' "$INDEX"; then
  fail "root index.html looks like Outflow — restore the hub (do not publish outflow to /)"
fi

if grep -Eqi 'Purple Sectors — Weekly|id="weekFlip"|Today’s issue|Today&#39;s issue' "$INDEX"; then
  fail "root index.html looks like Purple Sectors — restore the hub (do not publish purple to /)"
fi

# No Apex / EyesInfo scaffold at repo root or fake app folders.
for leftover in apex simracing eyesinfo; do
  if [[ -e "$ROOT/$leftover" ]]; then
    fail "unexpected project folder at repo root: $leftover (hub links only; do not scaffold here)"
  fi
done

# Transit leftovers at repo root usually mean a bad publish path.
for leftover in app-loader.js c5.js c6.js extra.css; do
  if [[ -e "$ROOT/$leftover" ]]; then
    fail "unexpected Transit leftover at repo root: $leftover (keep Transit under transit/ only)"
  fi
done

echo "check-hub: OK — root index.html is the hub"
