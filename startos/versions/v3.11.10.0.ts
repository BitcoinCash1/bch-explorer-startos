import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_10_0 = VersionInfo.of({
  version: '3.11.10:0',
  releaseNotes:
    'Upstream 3.11.10: pnpm v10 → v11, package version bumps, updated mining-pool logos (frontend). ' +
    'All Start9-specific patches (BCHD compatibility, B/s chart fix, Goggles start height, getMempoolEntry shim) carried forward.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
