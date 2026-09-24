#!/usr/bin/env bash
# Bump the package to a new upstream BCH Explorer release and open a pull request.
#
#   scripts/auto-bump.sh <upstream-tag>      e.g. scripts/auto-bump.sh 3.14.3
#
# Sets startos/versions/current.ts to `<upstream>:0` (a new upstream always
# starts at package revision 0), resets ALLOW_DOWNGRADE to false, updates the
# image tags in the manifest, then commits on `auto-bump/v<tag>` and opens a PR
# against master. Merging the PR is what releases it.
#
# The images must already be on GHCR (the Check Upstream workflow mirrors them
# from Melroy's registry before calling this).
#
# DRY_RUN=1 edits and commits locally but skips the push and the PR.
set -euo pipefail

TAG="${1:-}"
if [ -z "$TAG" ]; then
  echo "Usage: $0 <upstream-tag>" >&2
  exit 1
fi
# Melroy sometimes sends v3.13.0. Versions and image tags are unprefixed.
UPSTREAM="${TAG#v}"
CURRENT_FILE=startos/versions/current.ts
MANIFEST=startos/manifest/index.ts

CURRENT_VERSION=$(sed -nE "s/^[[:space:]]*version:[[:space:]]*'([^']+)'.*/\1/p" "$CURRENT_FILE" | head -1)
CURRENT_UPSTREAM="${CURRENT_VERSION%%:*}"
if [ "$CURRENT_UPSTREAM" = "$UPSTREAM" ]; then
  echo "Already at $UPSTREAM — no bump needed"
  exit 0
fi

# Never move the version downwards. Upstream re-tags old branches and a
# repository_dispatch can arrive out of order; StartOS compares the part before
# the colon as a semver, so a lower tag is a downgrade no server can migrate to.
HIGHEST=$(printf '%s\n%s\n' "$CURRENT_UPSTREAM" "$UPSTREAM" | sort -V | tail -1)
if [ "$HIGHEST" = "$CURRENT_UPSTREAM" ]; then
  echo "::warning::Tag $UPSTREAM is older than the packaged version $CURRENT_UPSTREAM — refusing to downgrade"
  exit 0
fi

NEW_VERSION="${UPSTREAM}:0"
echo "Bumping $CURRENT_VERSION -> $NEW_VERSION"

python3 - "$CURRENT_FILE" "$NEW_VERSION" "$UPSTREAM" <<'PY'
import re, sys
path, new_version, upstream = sys.argv[1:]
src = open(path).read()
src, n = re.subn(r"(\n\s*version:\s*)'[^']+'", rf"\g<1>'{new_version}'", src, count=1)
assert n == 1, 'version line not found'
# Release notes are rewritten for review in the PR; translations are added there.
src, n = re.subn(
    r"releaseNotes:\s*(\{.*?\n  \}|'[^']*'|`[^`]*`),",
    "releaseNotes: {\n    en_US: 'Updates BCH Explorer to upstream " + upstream + ".',\n  },",
    src, count=1, flags=re.S)
assert n == 1, 'releaseNotes not found'
src = re.sub(r"const ALLOW_DOWNGRADE = (true|false)", "const ALLOW_DOWNGRADE = false", src)
open(path, 'w').write(src)
PY

sed -i -E "s#(bch-explorer-(frontend|backend)):[0-9][^']*#\1:${UPSTREAM}#g" "$MANIFEST"

BRANCH="auto-bump/v${UPSTREAM}"
git checkout -b "$BRANCH"
git add "$CURRENT_FILE" "$MANIFEST"
# Pass the bot identity per-invocation so a local run does not rewrite the
# clone's own git identity.
git -c user.name="github-actions[bot]" \
    -c user.email="github-actions[bot]@users.noreply.github.com" \
    commit -m "feat: bump BCH Explorer to upstream ${UPSTREAM} (${NEW_VERSION})"

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "DRY_RUN: committed on $BRANCH, not pushed"
  exit 0
fi

git push origin "$BRANCH"
gh pr create --base master --head "$BRANCH" \
  --title "Bump BCH Explorer to upstream ${UPSTREAM} (${NEW_VERSION})" \
  --body "Automated bump to upstream BCH Explorer ${UPSTREAM}. Review the release notes (add translations) before merging; merging releases ${NEW_VERSION}."
