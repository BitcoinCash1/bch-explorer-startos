import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_13_2_0 = VersionInfo.of({
  version: '3.13.2:0',
  releaseNotes: 'Upstream 3.13.2. All Start9 patches (BCHD compatibility, B/s chart fix, Goggles start height, getMempoolEntry shim) carried forward.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
