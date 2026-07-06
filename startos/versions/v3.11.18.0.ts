import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_18_0 = VersionInfo.of({
  version: '3.11.18:0',
  releaseNotes: 'Upstream 3.11.18. All Start9 patches (BCHD compatibility, B/s chart fix, Goggles start height, getMempoolEntry shim) carried forward.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
