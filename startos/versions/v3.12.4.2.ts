import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_12_4_2 = VersionInfo.of({
  version: '3.12.4:2',
  releaseNotes: 'Upstream 3.12.4. All Start9 patches (BCHD compatibility, B/s chart fix, Goggles start height, getMempoolEntry shim) carried forward.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
