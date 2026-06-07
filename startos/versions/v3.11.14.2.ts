import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_14_2 = VersionInfo.of({
  version: '3.11.14:2',
  releaseNotes: 'Fix BCHN connection refused on non-mainnet networks: derive RPC port from network (mainnet=8332, chipnet=48332, testnet4=28342, scalenet=38332) instead of hardcoding 8332. BCHN remaps its RPC port per network to avoid ZMQ port conflicts.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
