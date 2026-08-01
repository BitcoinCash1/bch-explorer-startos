import { storeJson } from './fileModels/store.json'
import { sdk } from './sdk'

export const { createBackup, restoreInit } = sdk.setupBackups(
  async ({ effects }) =>
    sdk.Backups.withMysqlDump({
      imageId: 'db',
      dbVolume: 'db',
      datadir: '/var/lib/mysql',
      database: 'explorer',
      user: 'explorer',
      password: async () => (await storeJson.read().once())?.dbPassword ?? '',
      engine: 'mariadb',
      readyCommand: ['healthcheck.sh', '--connect', '--innodb_initialized'],
    }).addVolume('main'),
)
