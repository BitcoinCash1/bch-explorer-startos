import { sdk } from './sdk'
import { webPort, dbPort } from './utils'
import { storeJson } from './file-models/store.json'

export const main = sdk.setupMain(async ({ effects }) => {
  console.log('Starting BCH Explorer!')

  // Read store for DB credentials and selected node package
  const store = await storeJson.read().once()
  const dbPassword = store?.dbPassword ?? 'explorer'
  const nodePackageId = store?.nodePackageId ?? 'bitcoincashd'
  const nodeHost = `${nodePackageId}.startos`

  // Always connect to Fulcrum BCH for Electrum indexing
  const electrumHost = 'fulcrum-bch.startos'

  // Create the API subcontainer first so we can exec into it to read BCHN credentials
  // (the dependency volume is only accessible inside the subcontainer, not in the Node.js process)
  const apiSub = await sdk.SubContainer.of(
    effects,
    { imageId: 'backend' },
    sdk.Mounts.of()
      .mountVolume({
        volumeId: 'main',
        subpath: '/cache',
        mountpoint: '/backend/cache',
        readonly: false,
      })
      .mountDependency({
        dependencyId: nodePackageId,
        volumeId: 'main',
        subpath: null,
        mountpoint: '/mnt/node',
        readonly: true,
      }),
    'api-sub',
  )

  // Read node RPC credentials from the mounted dependency volume inside the subcontainer
  let nodeUser = nodePackageId
  let nodePass = ''
  try {
    const result = await apiSub.exec(['cat', '/mnt/node/store.json'])
    if (result.exitCode === 0) {
      const nodeStore = JSON.parse(result.stdout.toString()) as {
        rpcUser?: string
        rpcPassword?: string
      }
      nodeUser = nodeStore.rpcUser ?? nodeUser
      nodePass = nodeStore.rpcPassword ?? nodePass
    }
  } catch {
    console.warn('Could not read node store.json — using defaults')
  }

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
        fn: async () =>
          sdk.healthCheck.checkPortListening(effects, dbPort, {
            successMessage: 'Database is ready',
            errorMessage: 'Database is starting...',
          }),
      },
      requires: [],
    })
    .addDaemon('api', {
      subcontainer: apiSub,
      exec: {
        command: ['./start.sh'],
        env: {
          EXPLORER_BACKEND: 'electrum',
          EXPLORER_NETWORK: 'mainnet',
          EXPLORER_INDEXING_BLOCKS_AMOUNT: '-1',
          CORE_RPC_HOST: nodeHost,
          CORE_RPC_PORT: '8332',
          CORE_RPC_USERNAME: nodeUser,
          CORE_RPC_PASSWORD: nodePass,
          ELECTRUM_HOST: electrumHost,
          ELECTRUM_PORT: '50001',
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
        fn: async () =>
          sdk.healthCheck.checkPortListening(effects, 8999, {
            successMessage: 'BCH Explorer API is ready',
            errorMessage: 'BCH Explorer API is starting...',
          }),
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
        // v3.8.3 upstream images from registry.melroy.org
        command: sdk.useEntrypoint(),
        env: {
          // Entrypoint maps these to nginx config sed replacements
          BACKEND_MAINNET_HTTP_HOST: '127.0.0.1',
          BACKEND_MAINNET_HTTP_PORT: '8999',
          FRONTEND_HTTP_PORT: String(webPort),
          // Entrypoint maps these to __VAR__ exports for envsubst on config.js
          MAINNET_ENABLED: 'true',
          TESTNET_ENABLED: 'false',
          TESTNET4_ENABLED: 'false',
          SIGNET_ENABLED: 'false',
          ITEMS_PER_PAGE: '10',
          KEEP_BLOCKS_AMOUNT: '8',
          NGINX_PROTOCOL: 'http',
          NGINX_HOSTNAME: 'localhost',
          NGINX_PORT: '8999',
          MIN_BLOCK_SIZE_UNITS: '32000000',
          MEMPOOL_BLOCKS_AMOUNT: '1',
          BASE_MODULE: 'explorer',
          ROOT_NETWORK: '',
          WEBSITE_URL: 'https://bchexplorer.cash',
          MINING_DASHBOARD: 'true',
          AUDIT: 'false',
          MAINNET_BLOCK_AUDIT_START_HEIGHT: '0',
          TESTNET_BLOCK_AUDIT_START_HEIGHT: '0',
          SIGNET_BLOCK_AUDIT_START_HEIGHT: '0',
          TESTNET4_BLOCK_AUDIT_START_HEIGHT: '0',
          MAINNET_TX_FIRST_SEEN_START_HEIGHT: '0',
          TESTNET_TX_FIRST_SEEN_START_HEIGHT: '0',
          TESTNET4_TX_FIRST_SEEN_START_HEIGHT: '0',
          SIGNET_TX_FIRST_SEEN_START_HEIGHT: '0',
          REGTEST_TX_FIRST_SEEN_START_HEIGHT: '0',
          SERVICES_API: 'https://bchexplorer.cash/api/v1/services',
          HISTORICAL_PRICE: 'true',
          ADDITIONAL_CURRENCIES: 'false',
          STRATUM_ENABLED: 'false',
        },
      },
      ready: {
        display: 'Web UI',
        fn: async () =>
          sdk.healthCheck.checkPortListening(effects, webPort, {
            successMessage: 'BCH Explorer is ready',
            errorMessage: 'BCH Explorer web UI is starting...',
          }),
      },
      requires: ['api'],
    })
})
