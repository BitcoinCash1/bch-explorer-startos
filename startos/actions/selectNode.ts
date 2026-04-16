import { sdk } from '../sdk'
import { storeJson } from '../file-models/store.json'

const { InputSpec, Value } = sdk

const nodeInputSpec = InputSpec.of({
  nodePackageId: Value.text({
    name: 'Node Package ID',
    description:
      'StartOS package ID for the BCH node backend (for example: bitcoincashd).',
    required: true,
    default: 'bitcoincashd',
    patterns: [
      {
        regex: '^[a-z0-9][a-z0-9-]*$',
        description:
          'Must start with a lowercase letter/number and contain only lowercase letters, numbers, or hyphens.',
      },
    ],
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
    return {
      nodePackageId: store?.nodePackageId ?? 'bitcoincashd',
    }
  },

  async ({ effects, input }) => {
    await storeJson.merge(effects, {
      nodePackageId: input.nodePackageId,
    })
  },
)
