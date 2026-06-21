import { sdk } from '../sdk'
import { storeJson } from '../file-models/store.json'

const { InputSpec, Value } = sdk

const nodeInputSpec = InputSpec.of({
  nodePackageId: Value.select({
    name: 'Node Backend',
    description: 'Select which BCH full node the explorer should connect to.',
    default: 'bitcoincashd',
    values: {
      bitcoincashd: 'Bitcoin Cash Node',
      bchd: 'Bitcoin Cash Daemon',
      flowee: 'Flowee the Hub',
      'knuth-bch': 'Knuth',
    },
  }),
})

export const selectNode = sdk.Action.withInput(
  'select-node',

  {
    name: 'Select Node Backend',
    description:
      'Choose which BCH node package this explorer should use for RPC data.',
    warning:
      'Changing the node package may require dependency reconfiguration and service restart.',
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },

  nodeInputSpec,

  async ({ effects }) => {
    const store = await storeJson.read().once()
    const nodePackageId = store?.nodePackageId ?? 'bitcoincashd'
    return {
      nodePackageId: nodePackageId as 'bitcoincashd' | 'bchd' | 'flowee' | 'knuth-bch',
    }
  },

  async ({ effects, input }) => {
    await storeJson.merge(effects, {
      nodePackageId: input.nodePackageId,
      nodeConfirmed: true,
    })
    // main.ts reads nodePackageId once at startup (.once()), so re-run it now to
    // mount the newly-selected node and pick up its network — otherwise the
    // running backend stays stranded on the previous node (which may have been
    // removed). Mirrors BCHN's reindex actions: merge store, then restart.
    await effects.restart()
  },
)
