import { autoconfig } from 'bitcoin-cash-node-startos/startos/actions/config/autoconfig'
import { sdk } from './sdk'
import { storeJson } from './file-models/store.json'

export const setDependencies = sdk.setupDependencies(async ({ effects }) => {
  const store = await storeJson.read().const(effects)
  const nodePackageId = store?.nodePackageId ?? 'bitcoincashd'

  await sdk.action.createTask(effects, nodePackageId, autoconfig, 'critical', {
    input: {
      kind: 'partial',
      value: {
        prune: null,
        txindex: true,
        zmqEnabled: true,
      },
    },
    reason:
      'Pruning must be disabled, txindex and ZMQ must be enabled for BCH Explorer to function properly.',
    when: { condition: 'input-not-matches', once: false },
  })

  const nodeRequirement = {
    kind: 'running' as const,
    versionRange: '>=29.0.0:0',
    healthChecks: ['primary'],
  }

  const deps: Record<string, typeof nodeRequirement> = {
    bitcoincashd: nodeRequirement,
    'fulcrum-bch': {
      kind: 'running' as const,
      versionRange: '>=2.1.0:0',
      healthChecks: ['primary'],
    },
  }

  if (nodePackageId !== 'bitcoincashd') {
    deps[nodePackageId] = nodeRequirement
  }

  return deps as any
})
