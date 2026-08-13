import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_12_3_0 = VersionInfo.of({
  version: '3.12.3:0',
  releaseNotes: {
    en_US:
      'Fix address pages against Flowee: validateaddress rejects cashaddr (bchtest:/bitcoincash:), so the UI 500ed with "Failed to get address transactions". The cashaddr shim now decodes those addresses itself when the node returns isvalid=false.',
  },
  migrations: {
    up: async () => {},
    down: async () => {},
  },
})
