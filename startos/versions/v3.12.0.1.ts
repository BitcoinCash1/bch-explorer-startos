import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_12_0_1 = VersionInfo.of({
  version: '3.12.0:1',
  releaseNotes:
    'Knuth backend: enable JSON-RPC autoconfig (RPC on, full DB), use the same ' +
    'per-network RPC ports as BCHN/Flowee (not a hardcoded 8332), and declare ' +
    'knuth-bch in the package manifest.',
  migrations: {
    up: async () => {},
    down: async () => {},
  },
})
