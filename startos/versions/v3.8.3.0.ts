import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_8_3_0 = VersionInfo.of({
  version: '3.8.3:0',
  releaseNotes:
    'Upstream v3.8.3 by Melroy: legacy address support with better switching, ' +
    'address converter tool (cashaddr, token address, legacy). ' +
    'Images now pulled from upstream registry. MariaDB bumped to 11.4 LTS.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
