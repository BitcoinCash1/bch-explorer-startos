import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_12_0_2 = VersionInfo.of({
  version: '3.12.0:2',
  releaseNotes:
    'Add a Repair MariaDB maintenance action. After an unclean shutdown or a ' +
    'full disk, MariaDB can crash-loop on a corrupt tc.log (Bad magic header). ' +
    'StartOS Rebuild leaves that file on the db volume; this action deletes it ' +
    'and restarts, keeping the indexed explorer data.',
  migrations: {
    up: async () => {},
    down: async () => {},
  },
})
