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
    'https://github.com/BitcoinCash1/bch-explorer-startos/blob/master/instructions.md',
    'https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer',
  ],
  description: { short, long },
  volumes: ['main', 'db'],
  images: {
    frontend: {
      source: {
        dockerTag:
          'ghcr.io/bitcoincash1/bch-explorer-frontend:3.12.5',
      },
      arch: ['x86_64'],
      emulateMissingAs: 'x86_64',
    },
    backend: {
      source: {
        dockerTag:
          'ghcr.io/bitcoincash1/bch-explorer-backend:3.12.5',
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
  dependencies: {
    bitcoincashd: {
      description:
        'Bitcoin Cash Node — C++ full node. Provides blockchain RPC data to the explorer.',
      optional: true,
      metadata: {
        title: 'Bitcoin Cash Node',
        icon: 'dependency-icons/bitcoincashd.png',
      },
    },
    bchd: {
      description:
        'BCHD — Go-based full node. An alternative to Bitcoin Cash Node for providing RPC data.',
      optional: true,
      metadata: {
        title: 'Bitcoin Cash Daemon',
        icon: 'dependency-icons/bchd.png',
      },
    },
    flowee: {
      description:
        'Flowee the Hub — Fast BCH validator with SPV-level security. An alternative node for providing RPC data.',
      optional: true,
      metadata: {
        title: 'Flowee the Hub',
        icon: 'dependency-icons/flowee.png',
      },
    },
    'knuth-bch': {
      description:
        'Knuth — high-performance C++ BCH full node with optional JSON-RPC (v1.3.0+). Requires Fulcrum for address/history index.',
      optional: true,
      metadata: {
        title: 'Knuth',
        icon: 'dependency-icons/knuth-bch.svg',
      },
    },
    'fulcrum-bch': {
      description:
        'Fulcrum BCH provides the Electrum index required for address lookups and transaction history.',
      optional: false,
      metadata: {
        title: 'Fulcrum BCH',
        icon: 'dependency-icons/fulcrum-bch.png',
      },
    },
  },
})
