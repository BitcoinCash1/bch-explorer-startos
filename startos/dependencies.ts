import { autoconfig as bchnAutoconfig } from 'bitcoin-cash-node-startos/startos/actions/config/autoconfig'
import { autoconfig as bchdAutoconfig } from 'bitcoin-cash-daemon-startos/startos/actions/config/autoconfig'
import { autoconfig as floweeAutoconfig } from 'flowee-startos/startos/actions/config/autoconfig'
import { autoconfig as knuthAutoconfig } from 'knuth-bch-startos/startos/actions/config/autoconfig'
import { sdk } from './sdk'
import { storeJson } from './file-models/store.json'

export const setDependencies = sdk.setupDependencies(async ({ effects }) => {
  const store = await storeJson.read().const(effects)
  const nodePackageId = store?.nodePackageId ?? 'bitcoincashd'

  // Purge stale tasks from previous node selections
  await sdk.action.clearTask(
    effects,
    'bitcoincashd:autoconfig',
    'bchd:autoconfig',
    'flowee:autoconfig',
    'knuth-bch:autoconfig',
    'bitcoincashd-autoconfig',
    'bchd-autoconfig',
    'flowee-autoconfig',
    'knuth-bch-autoconfig',
  )

  if (store?.nodeConfirmed) {
    if (nodePackageId === 'bchd') {
      // BCHD: ensure pruning off, txindex on, gRPC on
      await sdk.action.createTask(effects, 'bchd', bchdAutoconfig, 'critical', {
        input: {
          kind: 'partial',
          value: {
            txindex: true,
            grpcEnabled: true,
          },
        },
        reason:
          'Pruning must be disabled, txindex must be enabled, and gRPC must be enabled for BCH Explorer to function properly.',
        when: { condition: 'input-not-matches', once: false },
      })
    } else if (nodePackageId === 'flowee') {
      // Flowee: ensure REST API is on
      await sdk.action.createTask(effects, 'flowee', floweeAutoconfig, 'critical', {
        input: {
          kind: 'partial',
          value: {
            rest: true,
          },
        },
        reason:
          'REST API must be enabled for BCH Explorer to function properly.',
        when: { condition: 'input-not-matches', once: false },
      })
    } else if (nodePackageId === 'knuth-bch') {
      // Knuth v1.3.0+: enable JSON-RPC + full DB (same idea as Fulcrum).
      await sdk.action.createTask(effects, 'knuth-bch', knuthAutoconfig, 'critical', {
        input: {
          kind: 'partial',
          // @ts-ignore
          value: {
            databaseMode: 'full',
            rpcEnabled: true,
          },
        },
        reason:
          'JSON-RPC must be enabled and database mode set to Full for BCH Explorer.',
        when: { condition: 'input-not-matches', once: false },
      })
    } else {
      // BCHN: ensure pruning off, txindex on, ZMQ on
      await sdk.action.createTask(effects, nodePackageId, bchnAutoconfig, 'critical', {
        input: {
          kind: 'partial',
          value: {
            txindex: true,
            zmqEnabled: true,
          },
        },
        reason:
          'Pruning must be disabled, transaction index and ZMQ must be enabled for BCH Explorer to function properly.',
        when: { condition: 'input-not-matches', once: false },
      })
    }
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
  } else if (nodePackageId === 'flowee') {
    deps['flowee'] = {
      kind: 'running',
      versionRange: '>=2026.2.0:0',
      healthChecks: ['primary'],
    }
  } else if (nodePackageId === 'knuth-bch') {
    deps['knuth-bch'] = {
      kind: 'running',
      versionRange: '>=1.3.0:0',
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
