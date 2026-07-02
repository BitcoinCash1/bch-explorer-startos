import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_16_0 = VersionInfo.of({
  version: '3.11.16:0',
  releaseNotes: 'Upstream 3.11.16. All Start9 patches (BCHD compatibility, B/s chart fix, Goggles start height, getMempoolEntry shim) carried forward.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
