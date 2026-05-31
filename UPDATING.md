# Updating the upstream version

This package uses pre-built Docker images for the frontend and backend, published to GHCR at
`ghcr.io/bitcoincash1/bch-explorer-frontend` and `ghcr.io/bitcoincash1/bch-explorer-backend`.
These are built from the patched fork at [BitcoinCash1/bch-explorer-startos](https://github.com/BitcoinCash1/bch-explorer-startos/tree/startos/patches).
Upstream source: [mempool/mempool](https://github.com/mempool/mempool) (bitcoin-cash-explorer branch).

## Determining the upstream version

Check the [upstream releases](https://github.com/mempool/mempool/releases) or the
[bitcoin-cash-explorer branch](https://github.com/mempool/mempool/tree/bitcoin-cash-explorer).
The current pin is in `startos/manifest/index.ts` at the `dockerTag` fields for
`bch-explorer-frontend` and `bch-explorer-backend` (e.g. `ghcr.io/bitcoincash1/bch-explorer-frontend:3.11.13`).

## Applying the bump

1. Apply upstream patches to the `startos/patches/` branch and build new frontend/backend images (see the patches directory).
2. Bump both `dockerTag` values in `startos/manifest/index.ts` to `ghcr.io/bitcoincash1/bch-explorer-frontend:<new version>` and `...-backend:<new version>`.
3. Add a new `startos/versions/v<X>.<Y>.<Z>.0.ts` file and update `startos/versions/index.ts` to set it as `current`.
4. Update version references in `README.md` and `instructions.md`.
