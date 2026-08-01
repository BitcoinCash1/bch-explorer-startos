# Updating the upstream version

This package runs prebuilt images rather than building from source. The upstream
software is
[bitcoin-cash-explorer](https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer),
Melroy van den Berg's Bitcoin Cash fork of
[mempool](https://github.com/mempool/mempool); the images are built from it and
published by the BitcoinCash1 org as `ghcr.io/bitcoincash1/bch-explorer-frontend`
and `ghcr.io/bitcoincash1/bch-explorer-backend`.

## Determining the upstream version

Read the latest upstream release tag:

```sh
curl -s 'https://gitlab.melroy.org/api/v4/projects/bitcoincash%2Fbitcoin-cash-explorer/releases?per_page=1' \
  | jq -r '.[0].tag_name'
```

Then confirm images for it have actually been published — a release exists before
its images do:

```sh
TOKEN=$(curl -s 'https://ghcr.io/token?scope=repository:bitcoincash1/bch-explorer-backend:pull' | jq -r .token)
curl -s -H "Authorization: Bearer $TOKEN" \
  https://ghcr.io/v2/bitcoincash1/bch-explorer-backend/tags/list | jq -r '.tags[]'
```

Both image tags track the upstream release number with no `v` prefix. The current
pin is in `startos/manifest/index.ts`, at the `dockerTag` of `images.frontend` and
`images.backend`.

## Applying the bump

1. Set both `dockerTag` values in `startos/manifest/index.ts` to the new version.
2. Raise `version` in `startos/versions/current.ts` to `<new upstream>:0` and
   rewrite its `releaseNotes` in all five locales. Only add a new version file if
   the bump needs a migration — see
   [Versions](https://docs.start9.com/packaging/versions.html).
3. Read the upstream release notes for changes to the backend files patched in
   `startos/shims.ts`. Each patch is a regex replacement that silently no-ops
   when its pattern no longer matches, so a renamed function does not fail the
   build — it removes the fix. Check the patched call sites still exist.
