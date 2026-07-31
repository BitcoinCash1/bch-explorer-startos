import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_14_8 = VersionInfo.of({
  version: '3.11.14:8',
  releaseNotes: 'Fix pruning task always showing: prune field is undefined (not 0) when disabled, so comparing prune:0 never matched. Remove prune from the autoconfig partial — txindex:true already implies pruning is off.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
