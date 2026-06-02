import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_13_2 = VersionInfo.of({
  version: '3.11.13:2',
  releaseNotes: 'Network is now derived from the connected node (single source of truth). Removed separate network selector — switch networks by changing the node\'s network setting. Chipnet and Scalenet frontend tabs now activate automatically when the node is on those networks.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
