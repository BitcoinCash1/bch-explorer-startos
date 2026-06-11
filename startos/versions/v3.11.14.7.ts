import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_14_7 = VersionInfo.of({
  version: '3.11.14:7',
  releaseNotes: 'Bundle instructions.md inside the package so the Instructions tab is populated in StartOS.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
