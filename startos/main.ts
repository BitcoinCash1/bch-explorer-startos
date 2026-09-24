import { FileHelper } from '@start9labs/start-sdk'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  backendCompatPatch,
  floweeRequireHook,
  frontendHex2Ascii,
  nginxMiningPoolsProxy,
  nginxNetworkRoutes,
} from './shims'
import {
  apiPort,
  dbPort,
  electrumBridge,
  explorerNetwork,
  hostPort,
  nodeMountpoint,
  nodeRpcBridge,
  webPort,
} from './utils'

/** The fields `main` reads out of the selected node's own `store.json`. */
type NodeStore = { network?: string; rpcUser?: string; rpcPassword?: string }

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting BCH Explorer'))

  // A `.const()` read, so choosing a different node backend re-runs main by
  // itself — the Select Node Backend action only has to write the store.
  const store = await storeJson.read().const(effects)
  const node = store?.nodePackageId ?? 'bitcoincashd'
  const dbPassword = store?.dbPassword ?? ''

  // The node's volume is mounted read-only purely so this can be read: the
  // chain it is on, and — on BCHN and BCHD, which publish them — the RPC
  // credentials. Flowee stores only hashed `rpcauth` entries, so the credential
  // for it is the one this package minted and registered.
  const apiSub = sdk.SubContainer.of(
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
        dependencyId: node,
        volumeId: 'main',
        subpath: null,
        mountpoint: nodeMountpoint,
        readonly: true,
      }),
    'api-sub',
  )

  const readNodeStore = async (): Promise<NodeStore | null> => {
    const res = await apiSub
      .exec(['cat', `${nodeMountpoint}/store.json`])
      .catch(() => null)
    if (!res || res.exitCode !== 0) return null
    try {
      return JSON.parse(res.stdout.toString()) as NodeStore
    } catch {
      return null
    }
  }

  const nodeStore = await readNodeStore()
  if (!nodeStore) {
    console.warn(
      i18n(
        'Could not read the settings of the selected node. Assuming mainnet until it reports otherwise.',
      ),
    )
  }
  const nodeNetwork = nodeStore?.network ?? 'mainnet'
  const network = explorerNetwork(nodeNetwork)
  if (!network) {
    throw new Error(
      i18n('BCH Explorer has no frontend for the ${network} chain.', {
        network: nodeNetwork,
      }),
    )
  }

  const rpc = await nodeRpcBridge(effects, node, network)
  if (!rpc) {
    console.warn(
      i18n(
        'The selected node is not reachable yet. The explorer will connect once it is installed and running.',
      ),
    )
  }
  const electrum = await electrumBridge(effects)
  if (!electrum) {
    console.warn(
      i18n(
        'Fulcrum BCH is not reachable yet. Address and transaction history will be unavailable until it is.',
      ),
    )
  }

  const rpcHostPort = rpc && hostPort(rpc)
  const electrumHostPort = electrum && hostPort(electrum)

  const rpcCredentials =
    node === 'flowee'
      ? {
          user: store?.floweeRpcUser ?? '',
          password: store?.floweeRpcPassword ?? '',
        }
      : {
          user: nodeStore?.rpcUser ?? node,
          password: nodeStore?.rpcPassword ?? '',
        }

  // The volume subpath is created with restrictive ownership and the backend
  // runs as a non-root user, so it cannot write `cache/tmp-cache.json` without
  // this. The directory is visible only inside this container.
  await apiSub.exec([
    'sh',
    '-c',
    'mkdir -p /backend/cache && chmod 777 /backend/cache',
  ])

  await apiSub.exec(['node', '-e', backendCompatPatch])

  if (node === 'flowee') {
    await FileHelper.string({
      base: sdk.volumes.main,
      subpath: '/cache/flowee-require-hook.js',
    }).write(effects, floweeRequireHook)
  }

  const dbSub = sdk.SubContainer.of(
    effects,
    { imageId: 'db' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'db',
      subpath: `/${network}`,
      mountpoint: '/var/lib/mysql',
      readonly: false,
    }),
    'db-sub',
  )

  const webSub = sdk.SubContainer.of(
    effects,
    { imageId: 'frontend' },
    sdk.Mounts.of(),
    'web-sub',
  )
  await webSub.exec(['sh', '-c', nginxMiningPoolsProxy])
  await webSub.exec(['sh', '-c', nginxNetworkRoutes])
  await webSub.exec(['sh', '-c', frontendHex2Ascii])

  return sdk.Daemons.of(effects)
    .addDaemon('db', {
      subcontainer: dbSub,
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
        display: i18n('Database'),
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, dbPort, {
            successMessage: i18n('The database is ready'),
            errorMessage: i18n('The database is starting'),
          }),
      },
      requires: [],
    })
    .addDaemon('api', {
      subcontainer: apiSub,
      exec: {
        // `start.sh` refuses to start while its PID file is present, so a
        // crashed backend would otherwise wedge every subsequent restart.
        command: [
          'sh',
          '-c',
          [
            `rm -f /backend/package/bch-explorer.pid 2>/dev/null`,
            `STALE=$(ss -tlnp 2>/dev/null | grep ":${apiPort} " | sed "s/.*pid=//;s/,.*//")`,
            `if [ -n "$STALE" ]; then echo "[startup] killing stale backend PID $STALE"; kill -9 "$STALE" 2>/dev/null || true; sleep 1; fi`,
            `exec ./start.sh`,
          ].join('\n'),
        ],
        env: {
          EXPLORER_BACKEND: 'electrum',
          EXPLORER_NETWORK: network,
          EXPLORER_INDEXING_BLOCKS_AMOUNT: '-1',
          // An absent dependency is left absent rather than pointed at an
          // address that cannot answer; the bridge read heals when it returns.
          ...(rpcHostPort && {
            CORE_RPC_HOST: rpcHostPort.host,
            CORE_RPC_PORT: rpcHostPort.port,
          }),
          CORE_RPC_USERNAME: rpcCredentials.user,
          CORE_RPC_PASSWORD: rpcCredentials.password,
          ...(electrumHostPort && {
            ELECTRUM_HOST: electrumHostPort.host,
            ELECTRUM_PORT: electrumHostPort.port,
          }),
          DATABASE_ENABLED: 'true',
          DATABASE_HOST: '127.0.0.1',
          DATABASE_PORT: String(dbPort),
          DATABASE_DATABASE: 'explorer',
          DATABASE_USERNAME: 'explorer',
          DATABASE_PASSWORD: dbPassword,
          STATISTICS_ENABLED: 'true',
          EXPLORER_AUDIT: 'true',
          EXPLORER_GOGGLES_INDEXING: 'true',
          ...(node === 'flowee' && {
            NODE_OPTIONS: '--require /backend/cache/flowee-require-hook.js',
          }),
        },
      },
      ready: {
        display: i18n('API'),
        fn: async () => {
          const res = await sdk.healthCheck.checkPortListening(
            effects,
            apiPort,
            {
              successMessage: i18n('The API is ready on ${network}', {
                network,
              }),
              errorMessage: i18n('The API is starting'),
            },
          )
          if (res.result !== 'success') return res

          // The node's chain lives in a file on its volume, which is not a
          // reactive source — and on BCHD and Flowee the RPC port does not move
          // with the chain, so the bridge address gives no signal either. This
          // is where that file gets re-read: once the API is up, a healthy poll
          // every 30s that finds the node on another chain restarts the service
          // so the right database and frontend come up.
          const current = (await readNodeStore())?.network
          if (!current || current === nodeNetwork) return res

          console.info(
            i18n('The node switched from ${from} to ${to}. Restarting.', {
              from: nodeNetwork,
              to: current,
            }),
          )
          await effects.restart()
          return { result: 'loading', message: null } as const
        },
      },
      requires: ['db'],
    })
    .addDaemon('web', {
      subcontainer: webSub,
      exec: {
        command: sdk.useEntrypoint(),
        env: {
          // The image's entrypoint substitutes these into its nginx config.
          BACKEND_MAINNET_HTTP_HOST: '127.0.0.1',
          BACKEND_MAINNET_HTTP_PORT: String(apiPort),
          FRONTEND_HTTP_PORT: String(webPort),
          // One backend serves one chain, so only the selected one is enabled.
          // `ROOT_NETWORK` pins the UI to it; mainnet is the default route and
          // takes the empty value.
          MAINNET_ENABLED: String(network === 'mainnet'),
          TESTNET_ENABLED: String(network === 'testnet'),
          TESTNET4_ENABLED: String(network === 'testnet4'),
          CHIPNET_ENABLED: String(network === 'chipnet'),
          SCALENET_ENABLED: String(network === 'scalenet'),
          SIGNET_ENABLED: 'false',
          ROOT_NETWORK: network === 'mainnet' ? '' : network,
          ITEMS_PER_PAGE: '10',
          KEEP_BLOCKS_AMOUNT: '8',
          NGINX_PROTOCOL: 'http',
          NGINX_HOSTNAME: 'localhost',
          NGINX_PORT: String(apiPort),
          MIN_BLOCK_SIZE_UNITS: '32000000',
          MEMPOOL_BLOCKS_AMOUNT: '1',
          BASE_MODULE: 'explorer',
          WEBSITE_URL: 'https://bchexplorer.cash',
          MINING_DASHBOARD: 'true',
          AUDIT: 'true',
          MAINNET_BLOCK_AUDIT_START_HEIGHT: '951500',
          TESTNET_BLOCK_AUDIT_START_HEIGHT: '0',
          TESTNET4_BLOCK_AUDIT_START_HEIGHT: '0',
          SIGNET_BLOCK_AUDIT_START_HEIGHT: '0',
          MAINNET_TX_FIRST_SEEN_START_HEIGHT: '951500',
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
        display: i18n('Web UI'),
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, webPort, {
            successMessage: i18n('The web interface is ready on ${network}', {
              network,
            }),
            errorMessage: i18n('The web interface is starting'),
          }),
      },
      requires: ['api'],
    })
})
