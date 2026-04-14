import { sdk } from './sdk'
import { storeJson } from './file-models/store.json'

export const { createBackup, restoreInit } = sdk.setupBackups(async () => {
  // Try to read password from store, fall back to default
  let dbPassword = 'explorer'
  try {
    const store = await storeJson.read().once()
    if (store?.dbPassword) {
      dbPassword = store.dbPassword
    }
  } catch {
    // Use default password
  }

  return sdk.Backups.withMysqlDump({
    imageId: 'db',
    dbVolume: 'db',
    datadir: '/var/lib/mysql',
    database: 'explorer',
    user: 'explorer',
    password: async () => dbPassword,
    engine: 'mariadb',
    readyCommand: ['healthcheck.sh', '--connect', '--innodb_initialized'],
  }).addVolume('main')
})
