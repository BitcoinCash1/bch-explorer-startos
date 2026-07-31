# BCH Explorer

BCH Explorer is a self-hosted Bitcoin Cash block explorer based on the open-source
[bitcoin-cash-explorer](https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer)
project. It lets you browse blocks, transactions, addresses, and mempool data from
your own node — no third party. This page covers what is specific to running it on
StartOS.

## What you get on StartOS

- A full **block explorer web UI** accessible from your LAN (port 8080) and optionally
  over Tor.
- **Block and transaction browsing** — every block, transaction, and address on the
  BCH chain is searchable.
- **Address history and balance** — powered by the Fulcrum Electrum index.
- **Mempool dashboard** — live unconfirmed transaction pool, fee histogram, and
  3-day mempool graph.
- **Mining pool dashboard** — recent block finders with pool logos (requires outbound
  clearnet access — see below).
- **BCH/USD price chart** (requires outbound clearnet access — see below).

## Prerequisites

BCH Explorer requires two dependencies, both fully synced:

1. **A Bitcoin Cash full node** (one of):
   - **Bitcoin Cash Node (BCHN)** — recommended.
   - **Bitcoin Cash Daemon (BCHD)**.
   - **Flowee the Hub**.

2. **Fulcrum** — provides the Electrum index for address and transaction history.

Both must be installed and completely synced before BCH Explorer becomes usable. The
explorer will display a loading state or blank pages until indexing is complete.

## Getting started

1. Install and fully sync a BCH full node (BCHN recommended).
2. Install and fully sync Fulcrum.
3. Install BCH Explorer. It connects to both dependencies automatically.
4. Open the BCH Explorer **Web UI** from the service's Dashboard to start browsing.

## Outbound access for price and pool data

BCH Explorer fetches mining pool logos and the BCH/USD price history from the
internet. Without outbound clearnet access, the mining-pool dashboard logos and
price chart remain blank.

To enable it: in StartOS go to **Services → BCH Explorer → Outbound Proxy** and
set it to your clearnet gateway interface (for example `enp1s0` or `eth0`). Once
set, the price chart and pool logos populate automatically.

## Configuration

Use **Config** to set:

- **Node Backend** — select BCHN, BCHD, or Flowee as the RPC data source.
- **Electrum Indexer** — select Fulcrum as the address/history backend.

No other configuration is required; the explorer discovers credentials and endpoints
from the dependency volumes automatically.

## Port

| Port | Protocol | Purpose                        |
|------|----------|--------------------------------|
| 8080 | HTTP     | BCH Explorer web UI            |

## Limitations

- **Both dependencies must be fully synced** before the explorer is functional.
  Expect several hours of IBD (node) plus several hours of indexing (Fulcrum) on first use.
- Mining pool logos and the price chart require outbound clearnet access configured
  via the Outbound Proxy setting.
- Database and explorer cache data are not included in backups. After a restore,
  the database repopulates automatically as the backend services come back up.
- Uninstalling BCH Explorer permanently deletes all cached explorer data and the
  MariaDB database.

## Support

- Package: <https://github.com/BitcoinCash1/bch-explorer-startos>
- Upstream: <https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer>
