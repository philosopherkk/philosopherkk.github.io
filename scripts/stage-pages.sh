#!/usr/bin/env bash
# Stage a GitHub Pages artifact from git-tracked files.
# Copies EVERY tracked file except:
#   - ci/          (tests / harness — excluded from Actions artifacts)
#   - .github/     (workflows)
#   - package.json / package-lock.json / node_modules (dev-only)
#
# With Pages source still on "Deploy from a branch", merging this branch to main
# publishes /deid/ (and leaves every other hub app unchanged). Switching Pages
# source to Actions is optional and only then uses this staging script (which
# omits ci/). If anyone switches to Actions, pages.yml must gain a push-to-main
# trigger or site updates will stop going live.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="${ROOT}/_site"
rm -rf "$STAGE"
mkdir -p "$STAGE"

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

# Prefer the current index (includes this branch's tracked app files).
while IFS= read -r -d '' f; do
  should_publish "$f" || continue
  src="$ROOT/$f"
  [[ -f "$src" ]] || continue
  mkdir -p "$STAGE/$(dirname "$f")"
  cp -a "$src" "$STAGE/$f"
done < <(git -C "$ROOT" ls-files -z)

echo "Staged Pages tree at $STAGE"
du -sh "$STAGE" 2>/dev/null || true
