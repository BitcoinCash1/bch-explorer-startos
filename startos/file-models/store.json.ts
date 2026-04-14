import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const shape = z
  .object({
    dbPassword: z.string().catch(''),
    initialized: z.boolean().catch(false),
    indexer: z.enum(['fulcrum']).nullable().catch(null),
  })
  .strip()

export const storeJson = FileHelper.json(
  {
    base: sdk.volumes.main,
    subpath: '/store.json',
  },
  shape,
)
