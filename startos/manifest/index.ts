import { setupManifest } from '@start9labs/start-sdk'
import {
  bchdDescription,
  bchnDescription,
  floweeDescription,
  fulcrumDescription,
  long,
  short,
} from './i18n'

export const manifest = setupManifest({
  id: 'bch-explorer',
  title: 'BCH Explorer',
  license: 'MIT',
  packageRepo: 'https://github.com/Start9-Community/bch-explorer-startos',
  upstreamRepo: 'https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer',
  marketingUrl: 'https://bchexplorer.cash',
  donationUrl: null,
  description: { short, long },
  volumes: ['main', 'db'],
  images: {
    frontend: {
      source: {
        dockerTag: 'ghcr.io/bitcoincash1/bch-explorer-frontend:3.12.0',
      },
      arch: ['x86_64'],
      emulateMissingAs: 'x86_64',
    },
    backend: {
      source: {
        dockerTag: 'ghcr.io/bitcoincash1/bch-explorer-backend:3.12.0',
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
      description: bchnDescription,
      optional: true,
      metadata: {
        title: 'Bitcoin Cash Node',
        icon: 'https://raw.githubusercontent.com/Start9-Community/bitcoin-cash-node-startos/master/icon.png',
      },
    },
    bchd: {
      description: bchdDescription,
      optional: true,
      metadata: {
        title: 'Bitcoin Cash Daemon',
        icon: 'https://raw.githubusercontent.com/Start9-Community/bitcoin-cash-daemon-startos/master/icon.png',
      },
    },
    flowee: {
      description: floweeDescription,
      optional: true,
      metadata: {
        title: 'Flowee the Hub',
        icon: 'https://raw.githubusercontent.com/Start9-Community/flowee-the-hub-startos/master/icon.png',
      },
    },
    'fulcrum-bch': {
      description: fulcrumDescription,
      optional: false,
      metadata: {
        title: 'Fulcrum BCH',
        icon: 'https://raw.githubusercontent.com/Start9-Community/fulcrum-bch-startos/master/icon.png',
      },
    },
  },
})
