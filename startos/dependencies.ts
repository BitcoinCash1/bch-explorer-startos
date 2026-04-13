import { sdk } from './sdk'

export const setDependencies = sdk.setupDependencies(
  async ({ effects: _effects }) => {
    return {
      'bitcoin-cash-node': {
        kind: 'running' as const,
        versionRange: '>=29.0.0:0',
        healthChecks: ['primary'],
      },
    }
  },
)
