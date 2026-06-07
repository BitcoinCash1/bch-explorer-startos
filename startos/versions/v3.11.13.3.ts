import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_13_3 = VersionInfo.of({
  version: '3.11.13:3',
  releaseNotes: 'Fix chipnet/testnet4/scalenet API routing: nginx now proxies non-mainnet network paths (/chipnet/api/...) to the backend, so the Explorer UI works correctly on all networks.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
