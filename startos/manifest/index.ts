import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'bch-explorer',
  title: 'BCH Explorer',
  license: 'MIT',
  packageRepo: 'https://github.com/BitcoinCash1/bch-explorer-startos',
  upstreamRepo: 'https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer',
  marketingUrl: 'https://bchexplorer.cash',
  donationUrl: null,
  docsUrls: [
    'https://github.com/BitcoinCash1/bch-explorer-startos/blob/master/docs/instructions.md',
    'https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer',
  ],
  description: { short, long },
  volumes: ['main', 'db'],
  images: {
    frontend: {
      source: {
        dockerTag:
          'registry.melroy.org/bitcoincash/bitcoin-cash-explorer/explorer-frontend:3.8.3',
      },
      arch: ['x86_64'],
      emulateMissingAs: 'x86_64',
    },
    backend: {
      source: {
        dockerTag:
          'registry.melroy.org/bitcoincash/bitcoin-cash-explorer/explorer-backend:3.8.3',
      },
      arch: ['x86_64'],
      emulateMissingAs: 'x86_64',
    },
    db: {
      source: { dockerTag: 'mariadb:11.4' },
      arch: ['x86_64', 'aarch64'],
      emulateMissingAs: 'x86_64',
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
    bitcoincashd: {
      description:
        'Bitcoin Cash Node is required to provide blockchain RPC data to the explorer.',
      optional: false,
      metadata: {
        title: 'Bitcoin Cash Node',
        icon: 'https://raw.githubusercontent.com/BitcoinCash1/bitcoin-cash-node-startos/master/icon.png',
      },
    },
    'fulcrum-bch': {
      description:
        'Fulcrum BCH provides the Electrum index required for address lookups and transaction history.',
      optional: false,
      metadata: {
        title: 'Fulcrum BCH',
        icon: 'https://raw.githubusercontent.com/BitcoinCash1/fulcrum-bch-startos/master/icon.png',
      },
    },
  },
})
