import { sdk } from '../sdk'
import { storeJson } from '../file-models/store.json'

const { InputSpec, Value } = sdk

const indexerInputSpec = InputSpec.of({
  indexer: Value.select({
    name: 'Select Indexer',
    description:
      'Select which Electrum server to use for address lookups',
    values: {
      fulcrum: 'Fulcrum BCH (recommended)',
    },
    default: 'fulcrum',
  }),
})

export const selectIndexer = sdk.Action.withInput(
  'select-indexer',

  {
    name: 'Select Indexer',
    description:
      'Enables address lookups via an Electrum indexer. Fulcrum is recommended for full transaction history.',
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },

  indexerInputSpec,

  async ({ effects }) => {
    const store = await storeJson.read().once()
    return {
      indexer: (store?.indexer ?? 'fulcrum') as any,
    }
  },

  async ({ effects, input }) =>
    storeJson.merge(effects, {
      indexer: input.indexer as 'fulcrum',
    }),
)
