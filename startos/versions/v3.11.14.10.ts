import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_14_10 = VersionInfo.of({
  version: '3.11.14:10',
  releaseNotes: 'Health checks now show the node backend and active network — e.g. "BCH Explorer ready — Flowee / chipnet".',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
