import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { NODE_IDS } from '../utils'

export const shape = z.object({
  dbPassword: z.string().catch(''),
  nodePackageId: z.enum(NODE_IDS).catch('bitcoincashd'),
  nodeConfirmed: z.boolean().catch(false),
  // Flowee authenticates against hashed `rpcauth` entries and cannot hand a
  // password back out, so the credential this package dials it with is minted
  // here and registered on Flowee by the Select Node Backend action. BCHN and
  // BCHD publish their own credentials in their `store.json`, which `main`
  // reads off the mounted node volume — nothing to keep here for them.
  floweeRpcUser: z.string().catch(''),
  floweeRpcPassword: z.string().catch(''),
  // Written by versions up to 3.12.0:0. A file model preserves keys it was not
  // told about, so these have to be named to be dropped — `network` and
  // `indexer` are no longer choices this package makes.
  initialized: z.undefined().optional().catch(undefined),
  network: z.undefined().optional().catch(undefined),
  indexer: z.undefined().optional().catch(undefined),
})

export const storeJson = FileHelper.json(
  {
    base: sdk.volumes.main,
    subpath: '/store.json',
  },
  shape,
)
