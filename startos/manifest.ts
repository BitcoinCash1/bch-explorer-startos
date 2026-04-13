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
          'registry.melroy.org/bitcoincash/bitcoin-cash-explorer/explorer-frontend:3.7',
      },
    },
    backend: {
      source: {
        dockerTag:
          'registry.melroy.org/bitcoincash/bitcoin-cash-explorer/explorer-backend:3.7',
      },
    },
    db: {
      source: { dockerTag: 'mariadb:12.2.1' },
    },
  },
  alerts: {
    install: null,
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
      s9pk: null,
    },
    'fulcrum-bch': {
      description:
        'Fulcrum BCH provides the Electrum index for richer transaction history. Highly recommended.',
      optional: true,
      s9pk: null,
    },
  },
})
