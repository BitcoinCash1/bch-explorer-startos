import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_7_8_0 = VersionInfo.of({
  version: '3.7.8:0',
  releaseNotes:
    'Initial release of BCH Explorer for StartOS. Powered by bitcoin-cash-explorer v3.7.8 by Melroy. Browse BCH transactions, addresses, and blocks. Connects to Bitcoin Cash Node for blockchain data and optionally to Fulcrum BCH for Electrum indexing.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
