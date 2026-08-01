# BCH Explorer

## Documentation

- [bitcoin-cash-explorer](https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer) — the upstream project this package runs.
- [Mempool documentation](https://mempool.space/docs) — the explorer bitcoin-cash-explorer is forked from. Its guides to the interface, the API and the mempool views apply here.

## What you get on StartOS

- A **web interface** for browsing Bitcoin Cash blocks, transactions and addresses, with search.
- A **live mempool dashboard** — unconfirmed transactions, the fee histogram and projected blocks.
- **Address history and balances**, served by Fulcrum BCH's index.
- A **mining dashboard** with pool statistics and block audits.
- All of it answered by your own node, so no third party learns what you look up.

## Getting set up

BCH Explorer reads from two other services, and both must be installed and fully
synced before it is usable.

1. Install and sync a Bitcoin Cash node — **Bitcoin Cash Node**, **Bitcoin Cash Daemon** or **Flowee the Hub**.
2. Install and sync **Fulcrum BCH**.
3. Run **Select Node Backend** and choose the node you installed. BCH Explorer asks for this before it will start.
4. Answer the task that then appears on the node you chose. Bitcoin Cash Node and Bitcoin Cash Daemon are asked to turn on transaction indexing; Flowee is asked to register a login for the explorer. Each opens pre-filled — confirm it.
5. Start BCH Explorer and open its **Web UI** from the Dashboard tab.

The explorer follows whichever chain your node is on. If you later switch the
node to another chain, BCH Explorer restarts onto it and builds a separate
database for it — your mainnet index is not thrown away.

## Using BCH Explorer

### Web interface

The Web UI opens on the block list, newest first. Blocks, transactions and
addresses are all reachable from the search bar. There is no login: anyone who
can reach the interface can browse it, so use the interface controls to decide
where it is exposed.

Until your node and Fulcrum BCH have finished syncing, pages load slowly or come
back empty. Indexing of historical statistics continues in the background after
that and can run for several hours; the dashboard fills in as it goes.

### Select Node Backend

Changes which node the explorer reads from. Choosing a different one restarts the
explorer and re-indexes against it, which takes a while — and you will be asked
to answer that node's setup task afterwards.

## Limitations

- **Mining-pool logos and the BCH/USD price chart are fetched from the internet.**
  Without outbound clearnet access both stay blank — the pool dashboard shows no
  logos and the price chart no data. To grant it, open BCH Explorer's **Actions**
  tab and use **Set Outbound Gateway** under the StartOS heading, choosing your
  clearnet gateway.
- **A node on regtest will not work.** The explorer has no regtest interface and
  reports an error instead of starting.
- **There is no Lightning section.** Bitcoin Cash has no Lightning Network, so
  the Lightning explorer in upstream Mempool does not apply.
