import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_14_11 = VersionInfo.of({
  version: '3.11.14:11',
  releaseNotes: 'Health checks now show the active network only — e.g. "BCH Explorer ready — chipnet". The node backend is already visible in the dependency panel.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
