import { sdk } from './sdk'

export const { createBackup, restoreInit } = sdk.setupBackups(async () =>
  // The MariaDB index is derived entirely from the node and the indexer, so the
  // `db` volume is not backed up at all — a restored install rebuilds it, the
  // same trade Fulcrum and electrs make. Only `store.json` is worth carrying:
  // the Flowee credential in it is registered on Flowee, so minting a new one
  // would mean answering that task again. `/cache` is the backend's own scratch.
  sdk.Backups.ofVolumes('main').setOptions({ exclude: ['/cache'] }),
)
