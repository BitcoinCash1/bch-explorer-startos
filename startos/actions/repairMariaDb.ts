import { sdk } from '../sdk'

export const repairMariaDb = sdk.Action.withoutInput(
  'repair-mariadb',
  async () => ({
    name: 'Repair MariaDB',
    description:
      'Delete the MariaDB transaction-coordinator log (tc.log) and restart the explorer. Use this when the Database health check reports a crash after an unclean shutdown or a full disk (Bad magic header in tc log). Indexed explorer data is kept.',
    warning:
      'The explorer will restart. Use this only if MariaDB is crash-looping on tc.log. A StartOS Rebuild does not remove that file.',
    allowedStatuses: 'any' as const,
    group: 'Maintenance',
    visibility: 'enabled' as const,
  }),
  async ({ effects }) => {
    let removed = 0
    await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'db' },
      sdk.Mounts.of().mountVolume({
        volumeId: 'db',
        subpath: null,
        mountpoint: '/var/lib/mysql',
        readonly: false,
      }),
      'repair-mariadb',
      async (sub) => {
        const listed = await sub.exec([
          'sh',
          '-c',
          'find /var/lib/mysql -name tc.log -print',
        ])
        removed = listed.stdout
          .toString()
          .split('\n')
          .filter((line) => line.trim().length > 0).length
        await sub.exec([
          'sh',
          '-c',
          'rm -f /var/lib/mysql/tc.log /var/lib/mysql/*/tc.log',
        ])
      },
    )
    await effects.restart()
    return {
      version: '1' as const,
      title: 'MariaDB repaired',
      message:
        removed === 0
          ? 'No tc.log was present. The explorer is restarting anyway.'
          : `Removed ${removed} tc.log file(s). MariaDB will recreate a clean log on startup. Indexed data was not deleted.`,
      result: null,
    }
  },
)
