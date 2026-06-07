import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_14_1 = VersionInfo.of({
  version: '3.11.14:1',
  releaseNotes: 'Fix stale network read on startup: increase LXC bind-mount settle wait from 5 s to 20 s so the MariaDB subpath mount and EXPLORER_NETWORK env always use the settled network value rather than stale data from a previous mount.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
