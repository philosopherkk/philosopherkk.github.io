#!/usr/bin/env bash
# Guard: root index.html must remain the hub, not an app shell.
# One owner manifest. Index slugs and the allow-list are that list.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INDEX="$ROOT/index.html"

# slug | owner | runtime files (comma-separated, hub folder-relative) | satellite repo
# owner is the tree an agent should edit. outflow-app is not an owner.
# transit owner is the file the live hub page loads.
# purple owner stays purple-sectors.
# waiting owner is the hub copy (it has the merger banner).
MANIFEST="$(cat <<'EOF'
transit|hub:transit/app.js||
purple|purple-sectors|index.html,data-app.js,data-series.js,data-tracks.js|purple-sectors
outflow|hub:outflow||
waiting|hub:waiting|index.html,app.js|hk-hospital-waiting-times
deid|hub:deid||
reportnreferral|hub:reportnreferral||
EOF
)"

fail() {
  echo "check-hub: FAIL — $*" >&2
  exit 1
}

manifest_rows() {
  printf '%s\n' "$MANIFEST" | sed '/^$/d'
}

manifest_slugs() {
  manifest_rows | cut -d'|' -f1
}

manifest_has() {
  local want="$1" slug
  while IFS= read -r slug; do
    [[ "$slug" == "$want" ]] && return 0
  done < <(manifest_slugs)
  return 1
}

index_slugs() {
  local index="$1"
  {
    grep -oE 'philosopherkk\.github\.io/[a-z0-9-]+/' "$index" | sed 's#.*github\.io/##; s#/$##' || true
    grep -oE '<code>[a-z0-9-]+/</code>' "$index" | sed 's#<code>##; s#/</code>##' || true
  } | sort -u
}

script_srcs() {
  local html="$1" tag src
  while IFS= read -r tag; do
    src="$(printf '%s\n' "$tag" | sed -n 's/.*src="\([^"]*\)".*/\1/p')"
    [[ -n "$src" ]] || continue
    printf '%s\n' "$src"
  done < <(grep -oE '<script[[:space:]][^>]*>' "$html" || true)
}

# A loader may name only files that exist beside it (or at an absolute site path).
check_loader() {
  local root="$1" script="$2" dir rel target missing quoted
  grep -q 'fetch(' "$script" || return 0
  dir="$(dirname "$script")"
  missing=0
  local seen=" "
  while IFS= read -r quoted; do
    [[ -n "$quoted" ]] || continue
    rel="${quoted#\"}"
    rel="${rel%\"}"
    rel="${rel#\'}"
    rel="${rel%\'}"
    case "$seen" in
      *" $rel "*) continue ;;
    esac
    seen="$seen$rel "
    if [[ "$rel" == /* ]]; then
      target="$root$rel"
    else
      target="$dir/$rel"
    fi
    if [[ ! -f "$target" ]]; then
      echo "loader $(basename "$script") names missing file $rel" >&2
      missing=1
    fi
  done < <(grep -oE '"[^"]+\.js"|'"'"'[^'"'"']+\.js'"'" "$script" || true)
  [[ "$missing" -eq 0 ]]
}

check_folder_agreement() {
  local root="$1"
  local index="$root/index.html"
  local slug
  [[ -f "$index" ]] || { echo "missing index.html"; return 1; }
  while IFS= read -r slug; do
    grep -Fq "${slug}/" "$index" || { echo "allow-list slug ${slug}/ is not linked from the index"; return 1; }
    [[ -d "$root/$slug" ]] || { echo "allow-list slug $slug has no directory"; return 1; }
  done < <(manifest_slugs)
  while IFS= read -r slug; do
    [[ -n "$slug" ]] || continue
    if [[ ! -d "$root/$slug" ]]; then
      echo "index links $slug and disk has no $slug directory"
      return 1
    fi
    if ! manifest_has "$slug"; then
      echo "index links $slug which is not in the owner manifest"
      return 1
    fi
  done < <(index_slugs "$index")
  return 0
}

check_live_scripts() {
  local slug owner files satellite html src path rel saw expected owner_ok
  while IFS='|' read -r slug owner files satellite; do
    [[ -n "$slug" ]] || continue
    html="$ROOT/$slug/index.html"
    [[ -f "$html" ]] || fail "missing $slug/index.html"
    saw=0
    owner_ok=0
    expected=""
    if [[ "$owner" == hub:*.js ]]; then
      expected="${owner#hub:}"
    fi
    while IFS= read -r src; do
      [[ -n "$src" ]] || continue
      case "$src" in
        http://*|https://*|//*) continue ;;
      esac
      saw=1
      if [[ "$src" == /* ]]; then
        path="$ROOT$src"
      else
        path="$ROOT/$slug/$src"
      fi
      [[ -f "$path" ]] || fail "$slug/index.html loads missing file $src"
      if node --check "$path"; then
        echo "node --check ${path#"$ROOT"/} exit 0"
      else
        fail "node --check failed: ${path#"$ROOT"/}"
      fi
      check_loader "$ROOT" "$path" || fail "loader names a missing file: ${path#"$ROOT"/}"
      rel="${path#"$ROOT"/}"
      if [[ -n "$expected" && "$rel" == "$expected" ]]; then
        owner_ok=1
      fi
    done < <(script_srcs "$html")
    [[ "$saw" -eq 1 ]] || fail "$slug/index.html has no local script src"
    if [[ -n "$expected" && "$owner_ok" -ne 1 ]]; then
      fail "owner $owner is not a file $slug/index.html loads"
    fi
  done < <(manifest_rows)
}

prove_missing_folder_fixture() {
  local tmp slug msg
  tmp="$(mktemp -d)"
  {
    echo '<!DOCTYPE html><html><body>'
    while IFS= read -r slug; do
      mkdir -p "$tmp/$slug"
      printf '<code>%s/</code>\n' "$slug"
      printf '<a href="https://philosopherkk.github.io/%s/">%s</a>\n' "$slug" "$slug"
    done < <(manifest_slugs)
    cat "$ROOT/ci/hub-fixture/missing-folder/index.html"
    echo '</body></html>'
  } > "$tmp/index.html"
  if msg="$(check_folder_agreement "$tmp")"; then
    rm -rf "$tmp"
    fail "fixture passed; an index that links marketdesk with no marketdesk directory must fail"
  fi
  rm -rf "$tmp"
  printf '%s\n' "$msg" | grep -Fq 'disk has no marketdesk directory' || fail "fixture failed for a different reason: $msg"
  echo "check-hub: fixture OK — index link to a missing folder fails"
}

prove_loader_fixture() {
  local tmp
  tmp="$(mktemp -d)"
  printf '%s\n' 'const files = ["missing.js"];' 'fetch("missing.js");' > "$tmp/loader.js"
  if check_loader "$tmp" "$tmp/loader.js"; then
    rm -rf "$tmp"
    fail "fixture passed; a loader that names a missing file must fail"
  fi
  printf '%s\n' 'fetch("present.js");' > "$tmp/ok-loader.js"
  printf '%s\n' '1;' > "$tmp/present.js"
  check_loader "$tmp" "$tmp/ok-loader.js" || fail "loader fixture rejected a file that exists"
  rm -rf "$tmp"
  echo "check-hub: fixture OK — loader naming a missing file fails"
}

satellite_root() {
  local name="$1" env_root="$2"
  local candidate
  if [[ -n "$env_root" && -d "$env_root" ]]; then
    printf '%s\n' "$env_root"
    return 0
  fi
  for candidate in "$ROOT/../$name" "/tmp/$name"; do
    if [[ -d "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

byte_compare() {
  local slug owner files satellite sat f a b differ
  differ=0
  while IFS='|' read -r slug owner files satellite; do
    [[ -n "$slug" && -n "$files" && -n "$satellite" ]] || continue
    case "$satellite" in
      purple-sectors)
        sat="$(satellite_root purple-sectors "${HUB_PURPLE_ROOT:-}")" || sat=""
        ;;
      hk-hospital-waiting-times)
        sat="$(satellite_root hk-hospital-waiting-times "${HUB_WAITING_ROOT:-}")" || sat=""
        ;;
      *)
        echo "byte-compare: FAIL — no lookup for satellite $satellite" >&2
        differ=1
        continue
        ;;
    esac
    if [[ -z "$sat" || ! -d "$sat" ]]; then
      echo "byte-compare: FAIL — satellite tree missing for $slug ($satellite)" >&2
      differ=1
      continue
    fi
    IFS=',' read -r -a parts <<< "$files"
    for f in "${parts[@]}"; do
      a="$ROOT/$slug/$f"
      b="$sat/$f"
      if [[ -f "$a" && -f "$b" ]] && cmp -s "$a" "$b"; then
        echo "byte-compare: OK $slug/$f matches $satellite (owner $owner)"
      else
        echo "byte-compare: FAIL $slug/$f differs from $satellite (owner $owner)" >&2
        if [[ "$owner" == hub:* ]]; then
          echo "byte-compare: owner is $owner; do not replace the hub file with the satellite copy" >&2
        fi
        differ=1
      fi
    done
  done < <(manifest_rows)
  [[ "$differ" -eq 0 ]]
}

BYTE_COMPARE=0
for arg in "$@"; do
  case "$arg" in
    --byte-compare) BYTE_COMPARE=1 ;;
    *) fail "unknown argument: $arg" ;;
  esac
done

[[ -f "$INDEX" ]] || fail "missing root index.html"

if ! msg="$(check_folder_agreement "$ROOT")"; then
  fail "$msg"
fi
allow="$(manifest_slugs | tr '\n' ' ')"
echo "check-hub: allow-list from manifest: ${allow% }"
echo "check-hub: owners:"
while IFS='|' read -r slug owner _files _satellite; do
  [[ -n "$slug" ]] || continue
  echo "  $slug $owner"
done < <(manifest_rows)

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

# The manifest must not name outflow-app. The readable outflow owner is the hub folder.
if printf '%s\n' "$MANIFEST" | grep -q 'outflow-app'; then
  fail "owner manifest names outflow-app"
fi

# Waiting owner is the hub copy. Copying the satellite over it deletes the banner.
grep -q 'mergeBanner' "$ROOT/waiting/index.html" || fail "waiting/index.html lost mergeBanner (hub copy is the owner; do not replace it with the satellite)"
grep -q 'mergeBanner' "$ROOT/waiting/app.js" || fail "waiting/app.js lost mergeBanner (hub copy is the owner; do not replace it with the satellite)"

check_live_scripts
prove_missing_folder_fixture
prove_loader_fixture

if [[ "$BYTE_COMPARE" -eq 1 ]]; then
  byte_compare || fail "byte compare failed"
fi

echo "check-hub: OK — root index.html is the hub"
