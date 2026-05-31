import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_13_1 = VersionInfo.of({
  version: '3.11.13:1',
  releaseNotes: 'Fix crash loop when Flowee is selected as node backend: strip extra boolean parameter from getBlock() that Flowee rejects with "JSON value is not a boolean as expected".',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
