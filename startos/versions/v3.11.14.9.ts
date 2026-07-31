import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_14_9 = VersionInfo.of({
  version: '3.11.14:9',
  releaseNotes: 'Fix Flowee RPC port on non-mainnet networks: Flowee remaps RPC port per network (e.g. chipnet=48332) the same as BCHN does.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
