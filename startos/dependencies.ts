import { T } from '@start9labs/start-sdk'
import { autoconfig as bchdAutoconfig } from 'bitcoin-cash-daemon-startos/startos/actions/config/autoconfig'
import { autoconfig as bchnAutoconfig } from 'bitcoin-cash-node-startos/startos/actions/config/autoconfig'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { INDEXER_ID, NodeId } from './utils'

export const setDependencies = sdk.setupDependencies(async ({ effects }) => {
  const store = await storeJson.read().const(effects)
  const node = store?.nodePackageId ?? 'bitcoincashd'

  // A task is keyed `<packageId>:<actionId>`. Clearing all three drops the ones
  // belonging to a node the user has since switched away from — otherwise they
  // sit in the task list against a node the explorer no longer talks to.
  await sdk.action.clearTask(
    effects,
    'bitcoincashd:autoconfig',
    'bchd:autoconfig',
    'flowee:create-dependent-credential',
  )

  if (store?.nodeConfirmed) {
    if (node === 'bitcoincashd') {
      await sdk.action.createTask(
        effects,
        'bitcoincashd',
        bchnAutoconfig,
        'critical',
        {
          input: {
            kind: 'partial',
            accept: [{ txindex: true }],
            set: { txindex: true },
          },
          when: { condition: 'input-not-matches', once: false },
          reason: i18n(
            'BCH Explorer looks up arbitrary transactions, which needs the full transaction index',
          ),
        },
      )
    } else if (node === 'bchd') {
      await sdk.action.createTask(effects, 'bchd', bchdAutoconfig, 'critical', {
        input: {
          kind: 'partial',
          accept: [{ txindex: true, prune: 0 }],
          set: { txindex: true, prune: 0 },
        },
        when: { condition: 'input-not-matches', once: false },
        reason: i18n(
          'BCH Explorer looks up arbitrary transactions, which needs an unpruned node and the full transaction index',
        ),
      })
    }
    // Flowee's task is raised by the Select Node Backend action instead: it
    // registers a credential, which `input-not-matches` cannot judge (Flowee
    // keeps only a hash and its action reports no current input), so a task
    // created here would reappear on every init however many times the user
    // had already answered it.
  }

  const nodeDependency: Record<NodeId, T.DependencyRequirement> = {
    bitcoincashd: {
      id: 'bitcoincashd',
      kind: 'running',
      versionRange: '>=29.0.0:10',
      healthChecks: ['primary', 'sync-progress'],
    },
    bchd: {
      id: 'bchd',
      kind: 'running',
      versionRange: '>=0.22.1:3',
      // BCHD serves RPC over its own TLS, which the explorer backend cannot
      // speak, so it is dialed through BCHD's plaintext proxy daemon.
      healthChecks: ['primary', 'sync-progress', 'rpc-plaintext'],
    },
    flowee: {
      id: 'flowee',
      kind: 'running',
      versionRange: '>=2026.5.2:12',
      healthChecks: ['primary', 'sync-progress'],
    },
  }

  return {
    [node]: nodeDependency[node],
    [INDEXER_ID]: {
      kind: 'running',
      versionRange: '>=2.1.1:17',
      healthChecks: ['primary', 'sync-progress'],
    },
  }
})
