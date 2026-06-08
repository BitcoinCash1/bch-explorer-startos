import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_14_5 = VersionInfo.of({
  version: '3.11.14:5',
  releaseNotes: 'Fix network switch: Explorer now reliably connects to the correct network after BCHN switches (was incorrectly using the old network due to LXC mount propagation timing).',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
