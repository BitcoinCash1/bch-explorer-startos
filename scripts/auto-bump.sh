#!/usr/bin/env bash
set -euo pipefail

DISPATCHED_TAG="${1:-}"
if [ -z "$DISPATCHED_TAG" ]; then
  echo "Usage: $0 <tag>" >&2
  exit 1
fi

CURRENT_VAR=$(grep -E '^[[:space:]]*current:' startos/versions/index.ts | head -1 \
  | sed -E 's/.*current:[[:space:]]*([A-Za-z0-9_]+).*/\1/')
VERSION_FILE_BASE=$(echo "$CURRENT_VAR" | sed -E 's/^v_//; s/_/./g')
CURRENT_UPSTREAM=$(grep -E "version:[[:space:]]*'" "startos/versions/v${VERSION_FILE_BASE}.ts" \
  | head -1 | sed -E "s/.*version:[[:space:]]*'([^':]+).*/\1/")

if [ "$CURRENT_UPSTREAM" = "$DISPATCHED_TAG" ]; then
  echo "Already at $DISPATCHED_TAG — no bump needed"
  exit 0
fi

# Never move `current` downwards. Upstream re-tags old branches and a
# repository_dispatch can arrive out of order; taking the payload on faith is
# how this package shipped 3.12.1:0 as an "update" to installs already running
# 3.12.4:1. StartOS compares the part before the colon as a semver, so a lower
# tag is a downgrade no marketplace will offer and no server can migrate to.
HIGHEST=$(printf '%s\n%s\n' "$CURRENT_UPSTREAM" "$DISPATCHED_TAG" | sort -V | tail -1)
if [ "$HIGHEST" = "$CURRENT_UPSTREAM" ]; then
  echo "::warning::Dispatched tag $DISPATCHED_TAG is older than the packaged version $CURRENT_UPSTREAM — refusing to downgrade; leaving the version graph alone"
  exit 0
fi

# Do not pin a tag whose images are not on GHCR yet. Melroy's dispatch can
# arrive before BitcoinCash1 has rebuilt frontend/backend — that is how
# 3.13.0:0 landed on master and then failed at `docker pull`. Skipping keeps
# Tag and Release green; a later dispatch of the same tag will bump.
FRONTEND_IMG="ghcr.io/bitcoincash1/bch-explorer-frontend:${DISPATCHED_TAG}"
BACKEND_IMG="ghcr.io/bitcoincash1/bch-explorer-backend:${DISPATCHED_TAG}"
if command -v docker >/dev/null 2>&1; then
  missing=0
  for img in "$FRONTEND_IMG" "$BACKEND_IMG"; do
    if ! docker manifest inspect "$img" >/dev/null 2>&1; then
      echo "::warning::GHCR image not found: $img"
      missing=1
    fi
  done
  if [ "$missing" -ne 0 ]; then
    echo "Upstream $DISPATCHED_TAG images are not on GHCR yet — leaving the version graph alone"
    exit 0
  fi
fi

# Never clobber a version file that already exists. `cat >` used to overwrite
# it, which is how the hand-written release notes for 3.12.2:0 and 3.12.3:0
# were replaced by the generic "Upstream <tag>" text. If :0 (or :1, …) was
# already spent on a packaging-only pin, take the next free revision so a
# later real upstream dispatch of the same tag still publishes (e.g. 3.12.4:2
# after 3.12.4:0/:1) instead of failing Tag and Release.
REV=0
while [ -e "startos/versions/v${DISPATCHED_TAG}.${REV}.ts" ]; do
  REV=$((REV + 1))
done

TAG_VAR="v_$(echo "$DISPATCHED_TAG" | tr '.' '_')_${REV}"
NEW_VERSION="${DISPATCHED_TAG}:${REV}"
NEW_FILE="startos/versions/v${DISPATCHED_TAG}.${REV}.ts"

if [ "$REV" -gt 0 ]; then
  echo "startos/versions/v${DISPATCHED_TAG}.0.ts already exists — using revision ${REV} (${NEW_VERSION})"
fi

echo "Bumping $CURRENT_UPSTREAM -> ${NEW_VERSION}"

cat > "$NEW_FILE" <<EOF
import { VersionInfo } from '@start9labs/start-sdk'

export const ${TAG_VAR} = VersionInfo.of({
  version: '${NEW_VERSION}',
  releaseNotes: 'Upstream ${DISPATCHED_TAG}. All Start9 patches (BCHD compatibility, B/s chart fix, Goggles start height, getMempoolEntry shim) carried forward.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
EOF

sed -i "s|explorer-frontend:[0-9][0-9.]*'|explorer-frontend:${DISPATCHED_TAG}'|g" startos/manifest/index.ts
sed -i "s|explorer-backend:[0-9][0-9.]*'|explorer-backend:${DISPATCHED_TAG}'|g" startos/manifest/index.ts
# Both edits below must be idempotent. Upstream tags do not always arrive in
# order, and a re-dispatch of the same tag re-runs this script — inserting the
# import or the `other` entry a second time produces
# "TS2300: Duplicate identifier", which fails the build.
if ! grep -q "import { ${TAG_VAR} } from" startos/versions/index.ts; then
  sed -i "1a import { ${TAG_VAR} } from './v${DISPATCHED_TAG}.${REV}'" startos/versions/index.ts
fi

sed -i "s/current: ${CURRENT_VAR}/current: ${TAG_VAR}/" startos/versions/index.ts

# Demote the previous current into `other`, unless it is already listed there.
if ! grep -qE "(\[|[[:space:]])${CURRENT_VAR}," startos/versions/index.ts; then
  sed -i "s/other: \[/other: [${CURRENT_VAR}, /" startos/versions/index.ts
fi

# Sanity-check the graph we just edited. auto-bump runs before `npm ci` in the
# workflow, so tsc usually is not installed yet — do not invoke npx here, it
# would fetch an arbitrary package or fail. Only type-check when a compiler is
# already present locally; otherwise fall back to a cheap textual duplicate
# check, which is the failure mode this script can actually cause.
if [ -x node_modules/.bin/tsc ]; then
  if ! node_modules/.bin/tsc --noEmit -p . >/dev/null 2>&1; then
    echo "auto-bump produced a version graph that does not type-check:" >&2
    node_modules/.bin/tsc --noEmit -p . 2>&1 | head -10 >&2
    exit 1
  fi
else
  dupes=$(grep -oE "^import \{ v_[0-9_]+ \}" startos/versions/index.ts | sort | uniq -d)
  if [ -n "$dupes" ]; then
    echo "auto-bump produced duplicate imports in startos/versions/index.ts:" >&2
    echo "$dupes" >&2
    exit 1
  fi
fi

# Never publish from a developer machine. This script ends in `git push`, so
# running it locally just to see what it would do used to push a real release
# commit to master — pinning image tags upstream had not built yet, which fails
# the build. In CI, GITHUB_ACTIONS is always "true".
if [ -z "${GITHUB_ACTIONS:-}" ]; then
  echo "Not running in GitHub Actions — bump left uncommitted." >&2
  echo "Inspect with 'git diff', then commit manually if that is what you want." >&2
  exit 0
fi

# Pass the bot identity per-invocation. `git config user.name ...` without
# --global writes .git/config, which permanently rewrites the identity of
# whichever clone it runs in — every later commit in that clone is then
# misattributed to github-actions[bot].
git add startos/versions/index.ts "$NEW_FILE" startos/manifest/index.ts
git -c user.name="github-actions[bot]" \
    -c user.email="github-actions[bot]@users.noreply.github.com" \
    commit -m "feat: auto-bump to upstream ${DISPATCHED_TAG} (v${NEW_VERSION})"
git push origin master
echo "Version bump committed — continuing build"
