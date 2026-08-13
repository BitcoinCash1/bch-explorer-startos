<div align="center">
  <img src="icon.png" alt="BCH Explorer logo" width="21%" />
  <h1>BCH Explorer</h1>
</div>

> **Upstream docs:** [gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer](https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer)
>
> BCH Explorer is a Bitcoin Cash block explorer based on Mempool/mempool, adapted for BCH by Melroy van den Berg. It provides a searchable web interface for blocks, transactions, addresses, mining statistics, and a mempool dashboard.

---

## Table of Contents

1. [Image and Container Runtime](#1-image-and-container-runtime)
2. [Volume and Data Layout](#2-volume-and-data-layout)
3. [Installation and First-Run Flow](#3-installation-and-first-run-flow)
4. [Default Networking](#4-default-networking)
5. [Configuration Management](#5-configuration-management)
6. [Network Access and Interfaces](#6-network-access-and-interfaces)
7. [Actions (StartOS UI)](#7-actions-startos-ui)
8. [Backups and Restore](#8-backups-and-restore)
9. [Health Checks](#9-health-checks)
10. [Dependencies](#10-dependencies)
11. [Default Overrides](#11-default-overrides)
12. [Limitations and Differences](#12-limitations-and-differences)
13. [What Is Unchanged from Upstream](#13-what-is-unchanged-from-upstream)
14. [Contributing](#14-contributing)
15. [Quick Reference for AI Consumers](#15-quick-reference-for-ai-consumers)

---

## 1. Image and Container Runtime

| Field | Value |
|---|---|
| **Frontend image** | `ghcr.io/bitcoincash1/bch-explorer-frontend:3.11.13` |
| **Backend image** | `ghcr.io/bitcoincash1/bch-explorer-backend:3.11.13` |
| **Database image** | `mariadb:11.4` |
| **Architectures** | `x86_64` (all three images; emulate missing arch as x86_64) |
| **Frontend command** | Upstream entrypoint (nginx + Angular) |
| **Backend command** | `./start.sh` (Node.js API server) |
| **Database command** | MariaDB with `--bind-address=127.0.0.1` |
| **SubContainers** | Three: `api-sub` (backend), `db-sub` (MariaDB), `web-sub` (nginx frontend) |

---

## 2. Volume and Data Layout

| Volume Name | Mount Point | Purpose |
|---|---|---|
| `main` | `/backend/cache` (subpath: `/cache`) | Backend cache files |
| `db` | `/var/lib/mysql` | MariaDB database files |

**StartOS-managed files:**

| File / Directory | Managed By | Purpose |
|---|---|---|
| `store.json` | StartOS SDK file model | Package state: selected node, network, indexer, DB password |
| `/backend/cache/` | Backend | Cached API responses (tmp-cache.json and related) |

**Dependency volume mounted at runtime (read-only):**

| Mount Point | Source | Purpose |
|---|---|---|
| `/mnt/node` | Selected node package `main` volume | Read `store.json` for node RPC credentials |

---

## 3. Installation and First-Run Flow

1. StartOS pulls all three images (frontend, backend, MariaDB).
2. Seed files are written: `store.json` with defaults (node: BCHN, network: mainnet, indexer: Fulcrum).
3. On first start, the backend SubContainer reads node RPC credentials from `/mnt/node/store.json`.
4. Cache directory permissions are fixed (`chmod 777 /backend/cache`) to allow the non-root backend process to write.
5. BCHD compatibility shims are applied at runtime via Node.js patches to the backend JavaScript (compensates for BCHD API differences from BCHN).
6. A frontend shim serves mining-pool SVGs from the frontend image (and strips any leftover nginx proxy to `bchexplorer.cash`, which now returns 403).
7. A hex2ascii display patch is applied to Angular chunk files to strip control characters from coinbase/OP_RETURN text.
8. MariaDB starts and becomes ready on port 3306.
9. The backend API starts, connects to MariaDB and the BCH node, and begins populating the database. The API is ready when port 8999 opens.
10. nginx frontend starts, proxying API requests to port 8999. The web UI is ready when port 8080 opens.
11. Fulcrum BCH provides Electrum data (address lookups, transaction history) continuously.

> **Note on outbound access:** The BCH/USD price chart still needs outbound clearnet (Services → BCH Explorer → Outbound Proxy). Pool logos are served from the frontend image.

---

## 4. Default Networking

| Transport | Default | Inbound | How to Change |
|---|---|---|---|
| **Clearnet (IPv4/IPv6)** | Enabled — web UI port exposed by StartOS | Enabled for browser access | Managed by StartOS |
| **Tor** | Available via StartOS routing | Available if StartOS assigns `.onion` address | Automatic via StartOS |
| **MariaDB** | Bound to `127.0.0.1` only | Not exposed externally | Internal only by design |

---

## 5. Configuration Management

| Group | Settings Covered |
|---|---|
| **Select Node Backend** | Choose which BCH full node provides RPC data: BCHN, BCHD, Flowee, Knuth |
| **Select Network** | Choose which BCH network to serve: mainnet, testnet4, chipnet, scalenet |
| **Select Indexer** | Choose Electrum indexer for address lookups (currently: Fulcrum BCH only) |

---

## 6. Network Access and Interfaces

| Interface | Port | Protocol | Purpose | Condition |
|---|---|---|---|---|
| Web UI | 8080 | HTTP | BCH Explorer web interface — blocks, transactions, addresses | Always |
| Backend API | 8999 | HTTP | Internal API (frontend → backend); not externally exposed | Internal |
| MariaDB | 3306 | TCP | Internal database; bound to 127.0.0.1 only | Internal |
| Electrum (Fulcrum) | 50001 | TCP | Address lookup via Fulcrum BCH (external dependency) | Always |

---

## 7. Actions (StartOS UI)

### Configuration

| Action ID | Name | Description |
|---|---|---|
| `select-node` | Select Node Backend | Choose which installed BCH node package provides blockchain RPC data |
| `select-network` | Select Network | Choose which BCH network the explorer serves (mainnet / testnet4 / chipnet / scalenet) |
| `select-indexer` | Select Indexer | Choose the Electrum indexer for address lookups (currently Fulcrum BCH only) |

### Maintenance

| Action                  | Purpose                                            | Visibility | Availability | Input | Output |
| ----------------------- | -------------------------------------------------- | ---------- | ------------ | ----- | ------ |
| **Repair MariaDB**      | Delete `tc.log` and restart after a crash-loop     | Enabled    | Any status   | None  | Count of removed logs |

**Repair MariaDB** mounts the `db` volume and deletes every `tc.log` (the
transaction-coordinator log). MariaDB refuses to start when that file has a bad
magic header after an unclean shutdown or a full disk. A StartOS Rebuild remakes
the container but leaves the file on the volume. Indexed explorer data is kept.

---

## 8. Backups and Restore

**What IS backed up:**
- `store.json` — selected node, network, indexer, DB password
- MariaDB `explorer` database — all indexed block, transaction, and mining statistics data (via `mysqldump`)
- `main` volume cache files

**What is NOT backed up:**
- Nothing additional is excluded beyond what `sdk.Backups.withMysqlDump` handles

The MariaDB dump is performed using `healthcheck.sh --connect --innodb_initialized` to ensure the database is ready before dumping. On restore, the database is re-imported automatically.

---

## 9. Health Checks

| Check | Method | Key Messages |
|---|---|---|
| **Database** (daemon ready) | `sdk.healthCheck.checkPortListening` on port 3306 | `Database is ready` / `Database is starting...` |
| **API** (daemon ready) | `sdk.healthCheck.checkPortListening` on port 8999 | `BCH Explorer API is ready` / `BCH Explorer API is starting...` |
| **Web UI** (daemon ready) | `sdk.healthCheck.checkPortListening` on port 8080 | `BCH Explorer is ready` / `BCH Explorer web UI is starting...` |

---

## 10. Dependencies

### Bitcoin Cash Node — BCHN (optional)

| Field | Value |
|---|---|
| **Package ID** | `bitcoincashd` |
| **Version constraint** | Any |
| **Required state** | Running and fully synced |
| **Mounted volumes** | `main` volume mounted read-only at `/mnt/node` for credential discovery |
| **Purpose** | Provides JSON-RPC for block and transaction data; supports all four networks (mainnet, testnet4, chipnet, scalenet) |

### Bitcoin Cash Daemon — BCHD (optional)

| Field | Value |
|---|---|
| **Package ID** | `bchd` |
| **Version constraint** | Any |
| **Required state** | Running and fully synced |
| **Mounted volumes** | `main` volume mounted read-only at `/mnt/node` for credential discovery |
| **Purpose** | Go BCH full node alternative; explorer uses plaintext proxy port 8334 for BCHD (BCHD RPC requires TLS; backend has no TLS support for `CORE_RPC`); mainnet only |

### Flowee the Hub (optional)

| Field | Value |
|---|---|
| **Package ID** | `flowee` |
| **Version constraint** | Any |
| **Required state** | Running and fully synced |
| **Mounted volumes** | `main` volume mounted read-only at `/mnt/node` for credential discovery |
| **Purpose** | Fast BCH validator alternative for explorer RPC; mainnet only |

### Fulcrum BCH (required)

| Field | Value |
|---|---|
| **Package ID** | `fulcrum-bch` |
| **Version constraint** | Any |
| **Required state** | Running and fully indexed |
| **Mounted volumes** | None (accessed via `fulcrum-bch.startos:50001` over the network) |
| **Purpose** | Required Electrum indexer for all address lookups and transaction history. Without Fulcrum, address search and history features are unavailable. |

**At least one of BCHN, BCHD, or Flowee is required, plus Fulcrum BCH.**

---

## 11. Default Overrides

| Setting | Upstream Default | StartOS Value | Reason |
|---|---|---|---|
| `CORE_RPC_PORT` for BCHD | 8332 | 8334 | BCHD's RPC is TLS-only; backend has no TLS support; stunnel plaintext proxy on 8334 is used |
| Mining pool logo assets | Proxied from `bchexplorer.cash` | Served from local `/resources/mining-pools/` | The Melroy image now ships the SVGs; the old proxy returns 403 |
| `tx_count` column type | `smallint unsigned` (max 65535) | `int unsigned` via runtime ALTER | BCH blocks can exceed 65535 transactions (e.g., block 840002 with 72,174 txs); causes INSERT errors otherwise |
| BCHD `getblock` verbosity response | Returns `rawtx` field | Shimmed: `tx = tx || rawtx || []` | BCHD uses `rawtx` instead of `tx` in verbosity=2 responses |
| BCHD `getblockstats` | Not implemented (-32601) | Shimmed: falls back to local stats | Explorer calls `getblockstats` for block statistics; BCHD does not implement it |
| hex2ascii control characters | Strips `\0` only | Also strips `\x00-\x1F\x7F-\x9F` | Coinbase and OP_RETURN payloads contain raw control bytes that render as gibberish glyphs |
| `ITEMS_PER_PAGE` | Varies upstream | `10` | Conservative default for StartOS hardware |
| `MINING_DASHBOARD` | Varies | `true` | Enables mining statistics dashboard |
| `AUDIT` | Varies | `true` | Enables block audit feature |

---

## 12. Limitations and Differences

1. **BCHD is mainnet only** for this explorer. BCHD does not support testnet4, chipnet, or scalenet.
2. **Flowee is mainnet only** for this explorer (Flowee currently supports mainnet only).
3. **Fulcrum BCH is always required** — it is the only supported Electrum indexer. The "Select Indexer" action exists for future extensibility but currently only offers Fulcrum.
4. Pool logos come from the frontend image. Unnamed chipnet miners still show the Unknown icon (no matching coinbase tag). The BCH/USD price chart still needs an outbound clearnet proxy.
5. Several BCHD API compatibility shims are applied at runtime by patching compiled JavaScript in the backend image. These shims compensate for BCHD API differences from the BCHN-compatible upstream. See `main.ts` for full detail.
6. The database `tx_count` column is widened from `smallint` to `int` at runtime via ALTER TABLE to support large BCH blocks. This ALTER is idempotent and safe to repeat.
7. All three containers (frontend, backend, MariaDB) are `x86_64` only. The `emulateMissingAs: x86_64` setting allows the package to install on aarch64/riscv64 hardware via emulation, with a performance penalty.

---

## 13. What Is Unchanged from Upstream

- All upstream Mempool/mempool-based BCH explorer functionality (block explorer, transaction lookup, address history, mempool dashboard)
- MariaDB schema (with the `tx_count` column widening applied)
- Electrum protocol client behavior for address lookups
- nginx frontend proxy configuration (with mining-pool asset proxy injected)
- Angular frontend functionality (with hex2ascii display fix applied)

---

## 14. Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 15. Quick Reference for AI Consumers

```yaml
package_id: bch-explorer
title: BCH Explorer
license: MIT
upstream_repo: https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer
package_repo: https://github.com/BitcoinCash1/bch-explorer-startos
images:
  frontend:
    source: ghcr.io/bitcoincash1/bch-explorer-frontend:3.11.13
    arch: [x86_64]
  backend:
    source: ghcr.io/bitcoincash1/bch-explorer-backend:3.11.13
    arch: [x86_64]
  db:
    source: mariadb:11.4
    arch: [x86_64, aarch64]
volumes:
  - name: main
    mountpoint: /backend/cache
    purpose: backend cache files
  - name: db
    mountpoint: /var/lib/mysql
    purpose: MariaDB database
ports:
  - interface: web
    port: 8080
    protocol: http
    purpose: BCH Explorer web interface
    condition: always
  - name: backend-api (internal)
    port: 8999
    protocol: http
    purpose: backend API — internal only
    condition: internal
  - name: mariadb (internal)
    port: 3306
    protocol: tcp
    purpose: database — internal, bound to 127.0.0.1
    condition: internal
dependencies:
  bitcoincashd:
    optional: true
    purpose: BCHN full node — blockchain RPC; supports all networks
  bchd:
    optional: true
    purpose: BCHD full node — mainnet only; uses plaintext proxy port 8334
  flowee:
    optional: true
    purpose: Flowee the Hub — mainnet only alternative
  fulcrum-bch:
    optional: false
    purpose: Required Electrum indexer for address lookups
networks_supported: [mainnet, testnet4, chipnet, scalenet]
startos_managed_files:
  - store.json
actions:
  - { id: select-node, name: "Select Node Backend", group: Configuration }
  - { id: select-network, name: "Select Network", group: Configuration }
  - { id: select-indexer, name: "Select Indexer", group: Configuration }
  - { id: repair-mariadb, name: "Repair MariaDB", group: Maintenance }
health_checks:
  - { id: db, display: "Database", method: "port 3306 listen check" }
  - { id: api, display: "API", method: "port 8999 listen check" }
  - { id: web, display: "Web UI", method: "port 8080 listen check" }
backup_volumes:
  - main
  - db (mysqldump of explorer database)
backup_excludes: []
```
