import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_14_3 = VersionInfo.of({
  version: '3.11.14:3',
  releaseNotes: 'Fix API crash loop: clear stale PID file and kill zombie backend before each startup attempt, preventing "Another mempool nodejs process already running" + EADDRINUSE when the SDK restarts the daemon within the same subcontainer.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
