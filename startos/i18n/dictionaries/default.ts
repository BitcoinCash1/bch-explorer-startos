export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting BCH Explorer': 0,
  'Could not read the settings of the selected node. Assuming mainnet until it reports otherwise.': 1,
  'BCH Explorer has no frontend for the ${network} chain.': 2,
  'The selected node is not reachable yet. The explorer will connect once it is installed and running.': 3,
  'Fulcrum BCH is not reachable yet. Address and transaction history will be unavailable until it is.': 4,
  Database: 5,
  'The database is ready': 6,
  'The database is starting': 7,
  API: 8,
  'The node switched from ${from} to ${to}. Restarting.': 9,
  'The API is ready on ${network}': 10,
  'The API is starting': 11,
  'Web UI': 12,
  'The web interface is ready on ${network}': 13,
  'The web interface is starting': 14,

  // interfaces.ts
  'Browse Bitcoin Cash blocks, transactions, addresses and the mempool': 15,

  // actions/selectNode.ts
  'Select Node Backend': 16,
  'Choose which Bitcoin Cash node the explorer reads chain data from.': 17,
  'The explorer restarts and re-indexes against the new node, which takes a while.': 18,
  'Node Backend': 19,
  'The node must be installed and fully synced before the explorer can use it.': 20,
  'Bitcoin Cash Node': 21,
  'Bitcoin Cash Daemon': 22,
  'Flowee the Hub': 23,
  'Flowee needs an RPC credential registered for BCH Explorer to log in with': 27,

  // init/taskSelectNode.ts
  'Choose which Bitcoin Cash node the explorer reads from': 24,

  // dependencies.ts
  'BCH Explorer looks up arbitrary transactions, which needs the full transaction index': 25,
  'BCH Explorer looks up arbitrary transactions, which needs an unpruned node and the full transaction index': 26,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
