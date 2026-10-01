import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

/**
 * Whether users may downgrade from this release to an earlier one. Set it per
 * release: `true` only when earlier versions can still read the data this one
 * leaves behind, `false` when this release is one-way.
 */
const ALLOW_DOWNGRADE = false

export const current = VersionInfo.of({
  version: '3.14.5:0',
  releaseNotes: {
    en_US: 'Updates BCH Explorer to upstream 3.14.5.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: ALLOW_DOWNGRADE ? async () => {} : IMPOSSIBLE,
  },
})
