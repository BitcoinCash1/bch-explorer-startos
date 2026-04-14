import { setupManifest } from '@start9labs/start-sdk'

export const manifest = setupManifest({
  id: 'bch-explorer',
  title: 'BCH Explorer',
  license: 'MIT',
  packageRepo: 'https://github.com/CyberAshven/bch-explorer-startos',
  upstreamRepo: 'https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer',
  marketingUrl: 'https://bchexplorer.cash',
  donationUrl: null,
  docsUrls: [
    'https://github.com/CyberAshven/bch-explorer-startos/blob/master/docs/instructions.md',
    'https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer',
  ],
  description: {
    short: 'Bitcoin Cash block explorer',
    long: 'BCH Explorer is a self-hosted Bitcoin Cash block explorer powered by Melroy\'s bitcoin-cash-explorer. Browse BCH transactions, addresses, and blocks directly from your StartOS node. Optionally connects to Fulcrum BCH for richer transaction history.',
  },
  volumes: ['main', 'db'],
  images: {
    frontend: {
      source: {
        dockerTag:
          'ghcr.io/cyberashven/bch-explorer-frontend:3.7.10',
      },
      arch: ['x86_64'],
    },
    backend: {
      source: {
        dockerTag:
          'ghcr.io/cyberashven/bch-explorer-backend:3.7.10',
      },
      arch: ['x86_64'],
    },
    db: {
      source: { dockerTag: 'mariadb:12.2.1' },
      arch: ['x86_64'],
    },
  },
  alerts: {
    install:
      'BCH Explorer requires both Bitcoin Cash Node and Fulcrum BCH to be installed and synced. The database will be populated automatically on first start.',
    update: null,
    uninstall:
      'Uninstalling BCH Explorer will permanently delete all cached explorer data and the database.',
    restore: null,
    start: null,
    stop: null,
  },
  dependencies: {
    'bitcoin-cash-node': {
      description:
        'Bitcoin Cash Node is required to provide blockchain RPC data to the explorer.',
      optional: false,
      metadata: {
        title: 'Bitcoin Cash Node',
        icon: 'https://raw.githubusercontent.com/CyberAshven/bitcoin-cash-node-startos/master/icon.png',
      },
    },
    'fulcrum-bch': {
      description:
        'Fulcrum BCH provides the Electrum index required for address lookups and transaction history.',
      optional: false,
      metadata: {
        title: 'Fulcrum BCH',
        icon: 'https://raw.githubusercontent.com/CyberAshven/fulcrum-bch-startos/master/icon.png',
      },
    },
  },
})
