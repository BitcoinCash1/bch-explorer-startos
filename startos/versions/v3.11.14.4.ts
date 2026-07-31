import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_14_4 = VersionInfo.of({
  version: '3.11.14:4',
  releaseNotes: 'Add network monitor: Explorer now automatically restarts within 15 seconds when BCHN switches networks (mainnet ↔ chipnet ↔ testnet4), requiring no manual intervention.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
