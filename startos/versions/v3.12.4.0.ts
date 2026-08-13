import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_12_4_0 = VersionInfo.of({
  version: '3.12.4:0',
  releaseNotes: {
    en_US:
      'Fix remaining "Failed to get address transactions" 500s against Flowee. ' +
      'Address pages hydrate Fulcrum history via getrawtransaction; one missing ' +
      'prevout or scriptPubKey aborted the whole page. Those lookups now skip ' +
      'the bad tx instead of 500ing. Token-aware cashaddr (explorer UI default) ' +
      'is accepted too.',
  },
  migrations: {
    up: async () => {},
    down: async () => {},
  },
})
