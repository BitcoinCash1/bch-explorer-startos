import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

const password = () =>
  utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 24 })

// Seeds each secret exactly once and then leaves it alone, rather than gating on
// `kind === 'install'`: the Flowee credential postdates installs that already
// exist, and the task that registers it on Flowee has nothing to send without it.
export const seedFiles = sdk.setupOnInit(async (effects) => {
  const store = await storeJson.read().once()

  await storeJson.merge(effects, {
    ...(!store?.dbPassword && { dbPassword: password() }),
    ...(!store?.floweeRpcUser && {
      floweeRpcUser: `bch_explorer_${utils.getDefaultString({
        charset: 'a-z',
        len: 8,
      })}`,
      floweeRpcPassword: password(),
    }),
  })
})
