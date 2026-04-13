import { readFileSync } from 'fs'
import { sdk } from './sdk'
import { webPort, dbPort } from './utils'
import { storeJson } from './file-models/store.json'
import { manifest as bchnManifest } from 'bitcoin-cash-node-startos/startos/manifest'

export const main = sdk.setupMain(async ({ effects }) => {
  // Read BCHN credentials from mounted volume
  let bchnUser = 'bitcoin-cash-node'
  let bchnPass = ''
  try {
    const raw = readFileSync('/mnt/bitcoin-cash-node/store.json', 'utf8')
    const bchnStore = JSON.parse(raw) as {
      rpcUser?: string
      rpcPassword?: string
    }
    bchnUser = bchnStore.rpcUser ?? bchnUser
    bchnPass = bchnStore.rpcPassword ?? bchnPass
  } catch {
    console.warn('Could not read BCHN store.json — using defaults')
  }

  // Read DB credentials from own store
  const store = await storeJson.read().once()
  const dbPassword = store?.dbPassword ?? 'explorer'

  // Check if Fulcrum BCH is installed and running
  const fulcrumIp = await sdk
    .getContainerIp(effects, { packageId: 'fulcrum-bch' })
    .once()
  const electrumHost = fulcrumIp ?? ''

  return sdk.Daemons.of(effects)
    .addDaemon('db', {
      subcontainer: await sdk.SubContainer.of(
        effects,
        { imageId: 'db' },
        sdk.Mounts.of().mountVolume({
          volumeId: 'db',
          subpath: null,
          mountpoint: '/var/lib/mysql',
          readonly: false,
        }),
        'db-sub',
      ),
      exec: {
        command: sdk.useEntrypoint(['--bind-address=127.0.0.1']),
        env: {
          MYSQL_DATABASE: 'explorer',
          MYSQL_USER: 'explorer',
          MYSQL_PASSWORD: dbPassword,
          MARIADB_AUTO_UPGRADE: '1',
          MARIADB_RANDOM_ROOT_PASSWORD: '1',
        },
      },
      ready: {
        display: 'Database',
        fn: async () => {
          const result = await sdk.healthCheck.checkPortListening(
            effects,
            dbPort,
            {
              successMessage: 'Database is ready',
              errorMessage: 'Database is starting...',
            },
          )
          return result
        },
      },
      requires: [],
    })
    .addDaemon('api', {
      subcontainer: await sdk.SubContainer.of(
        effects,
        { imageId: 'backend' },
        sdk.Mounts.of()
          .mountVolume({
            volumeId: 'main',
            subpath: '/cache',
            mountpoint: '/backend/cache',
            readonly: false,
          })
          .mountDependency<typeof bchnManifest>({
            dependencyId: 'bitcoin-cash-node',
            volumeId: 'main',
            subpath: null,
            mountpoint: '/mnt/bitcoin-cash-node',
            readonly: true,
          }),
        'api-sub',
      ),
      exec: {
        command: ['./start.sh'],
        env: {
          EXPLORER_BACKEND: electrumHost ? 'electrum' : 'node',
          EXPLORER_NETWORK: 'mainnet',
          EXPLORER_INDEXING_BLOCKS_AMOUNT: '-1',
          CORE_RPC_HOST: 'bitcoin-cash-node.startos',
          CORE_RPC_PORT: '8332',
          CORE_RPC_USERNAME: bchnUser,
          CORE_RPC_PASSWORD: bchnPass,
          ...(electrumHost ? { ELECTRUM_HOST: electrumHost } : {}),
          DATABASE_ENABLED: 'true',
          DATABASE_HOST: '127.0.0.1',
          DATABASE_PORT: String(dbPort),
          DATABASE_DATABASE: 'explorer',
          DATABASE_USERNAME: 'explorer',
          DATABASE_PASSWORD: dbPassword,
          STATISTICS_ENABLED: 'true',
        },
      },
      ready: {
        display: 'API',
        fn: async () => {
          const result = await sdk.healthCheck.checkPortListening(
            effects,
            8999,
            {
              successMessage: 'BCH Explorer API is ready',
              errorMessage: 'BCH Explorer API is starting...',
            },
          )
          return result
        },
      },
      requires: ['db'],
    })
    .addDaemon('web', {
      subcontainer: await sdk.SubContainer.of(
        effects,
        { imageId: 'frontend' },
        sdk.Mounts.of(),
        'web-sub',
      ),
      exec: {
        command: sdk.useEntrypoint(),
        env: {
          FRONTEND_HTTP_PORT: String(webPort),
          BACKEND_MAINNET_HTTP_HOST: '127.0.0.1',
        },
      },
      ready: {
        display: 'Web UI',
        fn: async () => {
          const result = await sdk.healthCheck.checkPortListening(
            effects,
            webPort,
            {
              successMessage: 'BCH Explorer is ready',
              errorMessage: 'BCH Explorer web UI is starting...',
            },
          )
          return result
        },
      },
      requires: ['api'],
    })
})
