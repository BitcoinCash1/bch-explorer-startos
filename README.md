<p align="center">
  <img src="icon.png" alt="BCH Explorer Logo" width="21%">
</p>

# BCH Explorer on StartOS

> **Upstream repo:** <https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer>
>
> Everything not listed in this document should behave the same as upstream
> bitcoin-cash-explorer. If a feature, setting, or behavior is not mentioned
> here, the upstream documentation is accurate and fully applicable.

A self-hosted Bitcoin Cash block explorer — a Bitcoin Cash fork of
[mempool](https://github.com/mempool/mempool). It serves blocks, transactions,
addresses, a live mempool view and fee/mining-pool statistics from a Bitcoin
Cash node you run yourself.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Configuration Management](#configuration-management)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Actions (StartOS UI)](#actions-startos-ui)
- [Backups and Restore](#backups-and-restore)
- [Health Checks](#health-checks)
- [Dependencies](#dependencies)
- [Limitations and Differences](#limitations-and-differences)
- [What Is Unchanged from Upstream](#what-is-unchanged-from-upstream)
- [Contributing](#contributing)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

Three prebuilt images, three subcontainers.

| Image      | Source                                       | Architectures   | Command                                |
| ---------- | -------------------------------------------- | --------------- | -------------------------------------- |
| `frontend` | `ghcr.io/bitcoincash1/bch-explorer-frontend` | x86_64          | image entrypoint (nginx)               |
| `backend`  | `ghcr.io/bitcoincash1/bch-explorer-backend`  | x86_64          | `./start.sh`, behind a stale-PID guard |
| `db`       | `mariadb`                                    | x86_64, aarch64 | image entrypoint, bound to `127.0.0.1` |

The frontend and backend images are published by the upstream packager and
declare `emulateMissingAs: 'x86_64'`, so they run under emulation on aarch64.

Neither can be rebuilt from this repository, so a set of fixes is applied to
them in place at start (`startos/shims.ts`). Each backend fix is a regex
replacement that no-ops when its pattern is absent. They cover RPC methods BCHD
and Flowee do not implement, a `smallint` block `tx_count` column too narrow for
BCH block sizes, and a truthy check that dropped a legitimate zero from the
websocket init payload; on the frontend, missing mining-pool assets, missing
non-mainnet nginx routes, and a `hex2ascii` pipe that left raw control bytes
from coinbase scriptsig on screen.

The backend command clears a stale PID file and any orphaned listener before
exec'ing `start.sh`, which otherwise refuses to start after an unclean exit.

---

## Volume and Data Layout

| Volume | Mount Point                            | Purpose                                                      |
| ------ | -------------------------------------- | ------------------------------------------------------------ |
| `main` | `/backend/cache` (subpath `cache`)     | Backend disk cache, and the Flowee require-hook when in use  |
| `main` | —                                      | `store.json`: this package's own state (see below)           |
| `db`   | `/var/lib/mysql` (subpath `<network>`) | MariaDB data directory, one per chain                        |

The database volume is mounted at a per-network subpath, so switching the node's
chain gives the explorer a fresh database rather than mixing chains in one.

`store.json` holds the generated database password, the selected node package,
whether the user has confirmed that selection, and the RPC credential minted for
Flowee. It carries no upstream configuration — the explorer is configured
entirely through environment variables.

The selected node's own `main` volume is mounted read-only at `/mnt/node` in the
backend subcontainer. The explorer never reads chain data from disk; the mount
exists so `main.ts` can read the node's `store.json` for the chain it is on and,
on BCHN and BCHD, its RPC credentials.

---

## Installation and First-Run Flow

1. A database password and an RPC credential for Flowee are generated at install
   and written to `store.json`.
2. A **critical task** prompts for **Select Node Backend**, so the explorer never
   runs against an unconfirmed node choice.
3. Selecting a node creates a further critical task on that node: transaction
   indexing (and, on BCHD, an unpruned chain) for BCHN and BCHD; registration of
   the RPC credential for Flowee.
4. `main` reads the node's chain and credentials, resolves the node and indexer
   bridge addresses, and starts the database, API and web daemons in that order.

There is no upstream setup wizard and no application login.

---

## Configuration Management

| StartOS-Managed                                                          | Upstream-Managed |
| ------------------------------------------------------------------------ | ---------------- |
| Node backend selection (`store.json`, via the Select Node Backend action) | Nothing          |
| Chain — follows the selected node, never set here                        |                  |
| RPC and Electrum addresses, credentials, database credentials            |                  |
| Every explorer setting, passed as environment variables                  |                  |

The upstream `mempool-config.json` is not used: this package configures the
backend and frontend purely through the environment variables their images read.

**StartOS-managed environment variables** — backend: `EXPLORER_BACKEND`,
`EXPLORER_NETWORK`, `EXPLORER_INDEXING_BLOCKS_AMOUNT`, `CORE_RPC_HOST`,
`CORE_RPC_PORT`, `CORE_RPC_USERNAME`, `CORE_RPC_PASSWORD`, `ELECTRUM_HOST`,
`ELECTRUM_PORT`, `DATABASE_*`, `STATISTICS_ENABLED`, `EXPLORER_AUDIT`,
`EXPLORER_GOGGLES_INDEXING`, and `NODE_OPTIONS` on Flowee only. Frontend:
`BACKEND_MAINNET_HTTP_HOST`, `BACKEND_MAINNET_HTTP_PORT`, `FRONTEND_HTTP_PORT`,
`ROOT_NETWORK`, the per-network `*_ENABLED` toggles, and the display settings
listed in `startos/main.ts`.

`CORE_RPC_HOST` / `CORE_RPC_PORT` and `ELECTRUM_HOST` / `ELECTRUM_PORT` are
omitted entirely while their dependency is absent, rather than pointed at an
address that cannot answer.

---

## Network Access and Interfaces

| Interface | Port | Protocol | Purpose                |
| --------- | ---- | -------- | ---------------------- |
| Web UI    | 8080 | HTTP     | The explorer front end |

**Access methods:**

- LAN IP with unique port
- `<hostname>.local` with unique port
- Tor `.onion` address
- Custom domains (if configured)

The API (8999) and database (3306) are internal to the service and are not bound
outside it.

Dependencies are reached over the internal host bridge, resolved with
`sdk.host.getBridgeAddress` from each dependency's own host id and internal
port. BCHN's RPC port moves with its chain, so the resolved address doubles as
the signal that it switched: the address becomes unresolvable and `main`
re-runs. BCHD and Flowee pin their RPC port on every chain, so a chain change
there is picked up by the API health check re-reading the node's `store.json`.

BCHD serves RPC over its own TLS, which the explorer backend cannot speak, so it
is dialed through BCHD's plaintext proxy binding rather than its native RPC.

---

## Actions (StartOS UI)

| Action                  | Purpose                                            | Visibility | Availability | Input                     | Output |
| ----------------------- | -------------------------------------------------- | ---------- | ------------ | ------------------------- | ------ |
| **Select Node Backend** | Choose the node the explorer reads chain data from | Enabled    | Any status   | One of BCHN, BCHD, Flowee | None   |
| **Repair MariaDB**      | Delete `tc.log` and restart after a crash-loop     | Enabled    | Any status   | None                      | Count of removed logs |

Writing the node selection is what restarts the explorer: `main` reads it through a
reactive `.const()` read.

**Repair MariaDB** mounts the `db` volume and deletes every `tc.log` (the
transaction-coordinator log). MariaDB refuses to start when that file has a bad
magic header after an unclean shutdown or a full disk. A StartOS Rebuild remakes
the container but leaves the file on the volume. Indexed explorer data is kept.

---

## Backups and Restore

**Included in backup:**

- `db` volume, via `mysqldump` (`Backups.withMysqlDump`) rather than a raw file
  copy, so the dump is consistent
- `main` volume — the backend cache and `store.json`

**Restore behavior:** the dump is reloaded into a freshly initialized data
directory before the service starts, so a restored install does not re-index the
chain from scratch.

---

## Health Checks

| Check    | Method                | Messages                                                                     |
| -------- | --------------------- | ---------------------------------------------------------------------------- |
| Database | Port listening (3306) | "The database is ready" / "The database is starting"                         |
| API      | Port listening (8999) | "The API is ready on `<network>`" / "The API is starting"                     |
| Web UI   | Port listening (8080) | "The web interface is ready on `<network>`" / "The web interface is starting" |

Startup is ordered: the API requires the database, and the web UI requires the
API. The API check additionally re-reads the selected node's `store.json` and
restarts the service when the node has switched chains.

---

## Dependencies

| Dependency              | Required           | Health checks required                      | Mounted volume            | Purpose                                                    |
| ----------------------- | ------------------ | ------------------------------------------- | ------------------------- | ---------------------------------------------------------- |
| **Fulcrum BCH**         | Yes                | `primary`, `sync-progress`                  | —                         | Electrum index for address lookups and transaction history |
| **Bitcoin Cash Node**   | One of these three | `primary`, `sync-progress`                  | `main` → `/mnt/node` (ro) | Chain data over JSON-RPC                                   |
| **Bitcoin Cash Daemon** | One of these three | `primary`, `sync-progress`, `rpc-plaintext` | `main` → `/mnt/node` (ro) | Chain data over JSON-RPC                                   |
| **Flowee the Hub**      | One of these three | `primary`, `sync-progress`                  | `main` → `/mnt/node` (ro) | Chain data over JSON-RPC                                   |

All three nodes are declared optional in the manifest; `setupDependencies`
promotes whichever one is selected to a required running dependency. Minimum
versions are declared in `startos/dependencies.ts`.

BCHN and BCHD publish their RPC credentials in their own `store.json`, which is
read off the mounted volume. Flowee stores only a hash of each RPC password and
cannot return one, so this package mints a credential at install and asks the
user — through a critical task on Flowee — to register it there.

---

## Limitations and Differences

1. **Regtest is not supported.** The frontend has no regtest build, so a node on
   regtest fails the explorer with an explicit error rather than starting into a
   broken UI.
2. **One chain at a time.** Upstream can serve several chains from one
   deployment; here the chain follows the selected node, and only that chain's
   routes and toggles are enabled.
3. **Mining-pool logos and the BCH/USD price chart need outbound clearnet
   access.** Both are fetched from `bchexplorer.cash`; without an outbound gateway
   set on the service, the pool dashboard and price chart stay blank.
4. **Lightning features are absent.** Bitcoin Cash has no Lightning Network, so
   upstream mempool's Lightning explorer does not apply.
5. **Address lookups require Fulcrum BCH.** The backend runs in Electrum mode;
   the Esplora and "none" backends upstream supports are not offered.
6. **The images are patched at runtime, not rebuilt.** An upstream image that
   renames the patched code will silently no-op that fix rather than fail loudly.

---

## What Is Unchanged from Upstream

- Block, transaction, address and mempool browsing, and search
- The fee estimator, mempool blocks projection and mempool graphs
- Mining dashboard, pool statistics and block audits
- The REST API and websocket API the front end itself consumes
- The frontend's own theming, language selection and display preferences

---

## Contributing

See [AGENTS.md](./AGENTS.md).

---

## Quick Reference for AI Consumers

```yaml
package_id: bch-explorer
architectures: [x86_64]
volumes:
  main: /backend/cache
  db: /var/lib/mysql
ports:
  web: 8080
dependencies:
  - fulcrum-bch
  - bitcoincashd
  - bchd
  - flowee
startos_managed_env_vars:
  - EXPLORER_BACKEND
  - EXPLORER_NETWORK
  - EXPLORER_INDEXING_BLOCKS_AMOUNT
  - CORE_RPC_HOST
  - CORE_RPC_PORT
  - CORE_RPC_USERNAME
  - CORE_RPC_PASSWORD
  - ELECTRUM_HOST
  - ELECTRUM_PORT
  - DATABASE_ENABLED
  - DATABASE_HOST
  - DATABASE_PORT
  - DATABASE_DATABASE
  - DATABASE_USERNAME
  - DATABASE_PASSWORD
  - STATISTICS_ENABLED
  - EXPLORER_AUDIT
  - EXPLORER_GOGGLES_INDEXING
  - NODE_OPTIONS
  - BACKEND_MAINNET_HTTP_HOST
  - BACKEND_MAINNET_HTTP_PORT
  - FRONTEND_HTTP_PORT
  - ROOT_NETWORK
actions:
  - select-node
  - repair-mariadb
```
