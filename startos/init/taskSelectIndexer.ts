import { selectIndexer } from '../actions/selectIndexer'
import { sdk } from '../sdk'

export const taskSelectIndexer = sdk.setupOnInit(async (effects, kind) => {
  if (kind === 'install') {
    await sdk.action.createOwnTask(effects, selectIndexer, 'critical', {
      reason: 'Select which Electrum server to use for address lookups',
    })
  }
})
