import { T } from '@start9labs/start-sdk'
import {
  rpcPlaintextHostId as bchdPlaintextHostId,
  rpcPlaintextPort as bchdPlaintextPort,
} from 'bitcoin-cash-daemon-startos/startos/utils'
import { networkPorts as bchnNetworkPorts } from 'bitcoin-cash-node-startos/startos/utils'
import {
  rpcHostId as floweeRpcHostId,
  rpcPort as floweeRpcPort,
} from 'flowee-startos/startos/utils'
import { electrumHostId, electrumPort } from 'fulcrum-bch-startos/startos/utils'
import { sdk } from './sdk'

export const webPort = 8080
export const apiPort = 8999
export const dbPort = 3306
export const webInterfaceId = 'web'
export const webHostId = 'main'

/**
 * Where the selected node's `main` volume is mounted, read-only, in the api
 * subcontainer. The explorer never reads the chain from disk — the mount exists
 * so `main` can read the node's `store.json` for its network and, on BCHN and
 * BCHD, its RPC credentials.
 */
export const nodeMountpoint = '/mnt/node'

export const NODE_IDS = ['bitcoincashd', 'bchd', 'flowee'] as const
export type NodeId = (typeof NODE_IDS)[number]

/**
 * The chains the explorer itself can render. Each node package names its own
 * networks slightly differently — BCHN says `testnet3` where Flowee says
 * `testnet` — so `explorerNetwork` maps a node's name onto one of these, and
 * returns `null` for a chain the explorer has no frontend for (regtest).
 */
export const EXPLORER_NETWORKS = [
  'mainnet',
  'testnet',
  'testnet4',
  'chipnet',
  'scalenet',
] as const
export type ExplorerNetwork = (typeof EXPLORER_NETWORKS)[number]

export const explorerNetwork = (
  nodeNetwork: string,
): ExplorerNetwork | null => {
  const mapped = nodeNetwork === 'testnet3' ? 'testnet' : nodeNetwork
  return EXPLORER_NETWORKS.includes(mapped as ExplorerNetwork)
    ? (mapped as ExplorerNetwork)
    : null
}

/**
 * Which binding each node publishes its JSON-RPC on, and — where the port moves
 * with the chain — how to derive it.
 *
 * BCHN remaps RPC per network, so its port is only knowable once the node's own
 * network is known. BCHD's plaintext stunnel proxy and Flowee's RPC are both
 * pinned to one port on every chain. BCHD is dialed through that proxy rather
 * than its native TLS RPC because the explorer backend has no TLS support for
 * `CORE_RPC`.
 */
const RPC_BINDINGS: Record<
  NodeId,
  { hostId: string; port: (network: ExplorerNetwork) => number; ssl?: boolean }
> = {
  bitcoincashd: {
    // Unlike BCHD and Flowee, the BCHN package does not export its host ids —
    // `interfaces.ts` there names this group with the same literal.
    hostId: 'rpc',
    port: (network) =>
      bchnNetworkPorts[network === 'testnet' ? 'testnet3' : network].rpc,
    ssl: false,
  },
  bchd: { hostId: bchdPlaintextHostId, port: () => bchdPlaintextPort },
  flowee: { hostId: floweeRpcHostId, port: () => floweeRpcPort, ssl: false },
}

/**
 * The selected node's JSON-RPC bridge address (`<osIp>:<assigned port>`).
 * `null` while the node is absent — the caller then leaves the explorer's
 * `CORE_RPC_HOST` unset rather than dialing an address that cannot answer, and
 * the `.const()` heals the moment the node appears.
 *
 * On BCHN this doubles as the network-change signal: switching chains rebinds
 * RPC to a different port, so this address goes `null` and `main` re-runs
 * against whatever the node moved to.
 */
export const nodeRpcBridge = (
  effects: T.Effects,
  node: NodeId,
  network: ExplorerNetwork,
) => {
  const { hostId, port, ssl } = RPC_BINDINGS[node]
  return sdk.host
    .getBridgeAddress(effects, {
      packageId: node,
      hostId,
      internalPort: port(network),
      ssl,
    })
    .const()
}

export const INDEXER_ID = 'fulcrum-bch'

/** Fulcrum BCH's plaintext Electrum bridge address. */
export const electrumBridge = (effects: T.Effects) =>
  sdk.host
    .getBridgeAddress(effects, {
      packageId: INDEXER_ID,
      hostId: electrumHostId,
      internalPort: electrumPort,
    })
    .const()

/** Split a bridge address (`<ipv4>:<port>`) into the pair the explorer's env expects. */
export const hostPort = (addr: string) => {
  const i = addr.lastIndexOf(':')
  return { host: addr.slice(0, i), port: addr.slice(i + 1) }
}
