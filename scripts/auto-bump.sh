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
echo "Bumping $CURRENT_UPSTREAM -> $DISPATCHED_TAG"

TAG_VAR="v_$(echo "$DISPATCHED_TAG" | tr '.' '_')_0"
NEW_VERSION="${DISPATCHED_TAG}:0"
NEW_FILE="startos/versions/v${DISPATCHED_TAG}.0.ts"

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
sed -i "1a import { ${TAG_VAR} } from './${DISPATCHED_TAG}.0'" startos/versions/index.ts
sed -i "s/current: ${CURRENT_VAR}/current: ${TAG_VAR}/" startos/versions/index.ts
sed -i "s/other: \[/other: [${CURRENT_VAR}, /" startos/versions/index.ts

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
git add startos/versions/index.ts "$NEW_FILE" startos/manifest/index.ts
git commit -m "feat: auto-bump to upstream ${DISPATCHED_TAG} (v${NEW_VERSION})"
git push origin master
echo "Version bump committed — continuing build"
