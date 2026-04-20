import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_8_13_0 = VersionInfo.of({
  version: '3.8.13:0',
  releaseNotes:
    'Upstream v3.8.13 by Melroy with the latest explorer fixes. ' +
    'Explorer frontend/backend images updated to 3.8.13.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})