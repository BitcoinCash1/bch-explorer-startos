import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_8_16_0 = VersionInfo.of({
  version: '3.8.16:0',
  releaseNotes:
    'Upstream v3.8.16 by Melroy with CashToken transaction preview improvements and fixes. ' +
    'Explorer frontend/backend images updated to 3.8.16.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
