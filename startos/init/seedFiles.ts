import { sdk } from '../sdk'
import { storeJson } from '../file-models/store.json'

function generatePassword(length = 24): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') return

  const dbPassword = generatePassword(24)

  await storeJson.merge(effects, {
    dbPassword,
    initialized: true,
    nodePackageId: 'bitcoincashd',
    indexer: null,
  })
})
