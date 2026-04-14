import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_7_10_1 = VersionInfo.of({
  version: '3.7.10:1',
  releaseNotes:
    'Fulcrum BCH is now a required dependency for address lookups. The "node only" indexer option has been removed. Select Indexer task now properly appears until confirmed.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
