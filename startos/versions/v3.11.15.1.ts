import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_15_1 = VersionInfo.of({
  version: '3.11.15:1',
  releaseNotes:
    'Selecting a different node backend now restarts the explorer immediately so the change takes effect. Previously main.ts read the node selection only at startup, so switching nodes (or removing the previously-selected node) left the backend stranded on the previous node until a manual restart. Mirrors the BCHN reindex-action pattern (merge store, then effects.restart()).',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
