import { autoconfig as bchnAutoconfig } from 'bitcoin-cash-node-startos/startos/actions/config/autoconfig'
import { sdk } from './sdk'
import { storeJson } from './file-models/store.json'

export const setDependencies = sdk.setupDependencies(async ({ effects }) => {
  const store = await storeJson.read().const(effects)
  const nodePackageId = store?.nodePackageId ?? 'bitcoincashd'

  if (nodePackageId === 'bchd') {
    // BCHD always has txindex and no ZMQ concerns; no config task needed
  } else {
    // BCHN — require txindex + ZMQ (txindex=true implicitly prevents pruning,
    // since BCHN's own interlock disables txindex when pruning is enabled)
    await sdk.action.createTask(effects, nodePackageId, bchnAutoconfig, 'critical', {
      input: {
        kind: 'partial',
        value: {
          txindex: true,
          zmqEnabled: true,
        },
      },
      reason:
        'Transaction index and ZMQ must be enabled for BCH Explorer to function properly.',
      when: { condition: 'input-not-matches', once: false },
    })
  }

  const deps: Record<string, { kind: 'running'; versionRange: string; healthChecks: string[] }> = {
    'fulcrum-bch': {
      kind: 'running',
      versionRange: '>=2.1.0:0',
      healthChecks: ['primary'],
    },
  }

  if (nodePackageId === 'bchd') {
    deps['bchd'] = {
      kind: 'running',
      versionRange: '>=0.21.1:0',
      healthChecks: ['primary'],
    }
  } else {
    deps[nodePackageId] = {
      kind: 'running',
      versionRange: '>=29.0.0:0',
      healthChecks: ['primary'],
    }
  }

  return deps as any
})
