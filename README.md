## Architecture Support

Currently x86_64 only. To add aarch64 (ARM) support in the future:

1. Build multi-arch Docker images:
  ```bash
  docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/cyberashven/bch-explorer-frontend:3.7.10 .
  docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/cyberashven/bch-explorer-backend:3.7.10 .
  ```

2. Update `startos/manifest.ts` image arch fields:
  ```typescript
  arch: ['x86_64', 'aarch64'],
  ```
<p align="center">
  <img src="icon.png" alt="BCH Explorer Logo" width="21%">
</p>

# BCH Explorer on StartOS

> **Upstream project:** <https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer>
>
> Everything not listed in this document should behave the same as upstream
> Bitcoin Cash Explorer. If a feature, setting, or behavior is not mentioned
> here, the upstream documentation is accurate and fully applicable.

[BCH Explorer](https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer) is a self-hosted Bitcoin Cash block explorer powered by Melroy's bitcoin-cash-explorer. Browse BCH transactions, addresses, and blocks directly from your StartOS node. Optionally connects to Fulcrum BCH for richer transaction history.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Configuration Management](#configuration-management)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Backups and Restore](#backups-and-restore)
- [Health Checks](#health-checks)
- [Dependencies](#dependencies)
- [Limitations and Differences](#limitations-and-differences)
- [What Is Unchanged from Upstream](#what-is-unchanged-from-upstream)
- [Contributing](#contributing)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

| Property      | Value                                                          |
| ------------- | -------------------------------------------------------------- |
| Frontend      | `ghcr.io/cyberashven/bch-explorer-frontend` (mirrored from upstream) |
| Backend       | `ghcr.io/cyberashven/bch-explorer-backend` (mirrored from upstream)  |
| MariaDB       | `mariadb:10.4.32`                       |
| Architectures | x86_64                                                         |
| Runtime       | Three containers (Frontend + Backend + MariaDB)                |

The frontend and backend images are mirrored from `registry.melroy.org` to GHCR for reliable CI builds. They are unmodified upstream images.

## Volume and Data Layout

| Volume | Mount Point      | Purpose              |
| ------ | ---------------- | -------------------- |
| `main` | `/backend/cache` | Backend cache data   |
| `db`   | `/var/lib/mysql`  | MariaDB database     |

StartOS-specific files:

| File           | Volume | Purpose                                      |
| -------------- | ------ | -------------------------------------------- |
| `store.json`   | `main` | StartOS state (database credentials)         |

## Installation and First-Run Flow

1. **Ensure Bitcoin Cash Node is installed** and fully synced
2. Install BCH Explorer from the StartOS marketplace
3. Wait for Bitcoin Cash Node to finish syncing
4. BCH Explorer will automatically connect to Bitcoin Cash Node via RPC
5. Optionally install Fulcrum BCH for richer address and transaction lookups

**Uninstall alert:** Uninstalling BCH Explorer will permanently delete all cached explorer data and the database.

## Configuration Management

BCH Explorer is configured automatically by StartOS — no manual configuration is needed.

### Auto-Configured by StartOS

| Setting              | Value                        | Purpose                    |
| -------------------- | ---------------------------- | -------------------------- |
| `CORE_RPC_HOST`      | `bitcoin-cash-node.startos`  | Bitcoin Cash Node RPC host |
| `CORE_RPC_PORT`      | `8332`                       | Bitcoin Cash Node RPC port |
| `CORE_RPC_USERNAME`  | From BCHN `store.json`       | RPC authentication         |
| `CORE_RPC_PASSWORD`  | From BCHN `store.json`       | RPC authentication         |
| `DATABASE_HOST`      | `127.0.0.1`                  | MariaDB connection         |
| `DATABASE_PORT`      | `3306`                       | MariaDB port               |
| `DATABASE_DATABASE`  | `explorer`                   | Database name              |
| `EXPLORER_NETWORK`   | `mainnet`                    | Bitcoin Cash mainnet       |
| `STATISTICS_ENABLED` | `true`                       | Block statistics           |

When Fulcrum BCH is installed, `ELECTRUM_HOST` and `EXPLORER_BACKEND=electrum` are automatically configured.

## Network Access and Interfaces

| Interface | Port | Protocol | Purpose                    |
| --------- | ---- | -------- | -------------------------- |
| Web UI    | 8080 | HTTP     | BCH Explorer web interface |

The backend API runs on port 8999 internally but is not exposed as a separate interface.

## Backups and Restore

**Volumes backed up:**

- `main` — Backend cache data
- `db` — MariaDB database

**Restore behavior:** All data is restored from the backup. The database may need time to re-sync recent blocks after restore.

## Health Checks

| Check        | Method              | Messages                                                   |
| ------------ | ------------------- | ---------------------------------------------------------- |
| **Database** | Port 3306 listening | Success: "Database is ready" / Loading: "Database is starting..." |
| **API**      | Port 8999 listening | Success: "BCH Explorer API is ready" / Loading: "BCH Explorer API is starting..." |
| **Web UI**   | Port 8080 listening | Success: "BCH Explorer is ready" / Loading: "BCH Explorer web UI is starting..." |

## Dependencies

| Dependency         | Required | Purpose                                     | Auto-Config             |
| ------------------ | -------- | ------------------------------------------- | ----------------------- |
| Bitcoin Cash Node  | Yes      | Blockchain data via RPC                     | RPC credentials from `store.json` |
| Fulcrum BCH        | No       | Electrum index for address/transaction lookups | Connects automatically  |

Bitcoin Cash Node must be running with version ≥ 29.0.0 and passing its primary health check.

## Limitations and Differences

1. **Mainnet only** — Testnet and other networks not available
2. **x86_64 only** — ARM/aarch64 not supported (upstream images are x86_64 only)
3. **No mining pool logo sync** — The upstream `sync-assets.js` step is skipped; some mining pool logos may be missing

## What Is Unchanged from Upstream

- Full block explorer functionality
- Transaction lookup and details
- Address lookup and balance display
- Block details and navigation
- Real-time mempool visualization
- Mining statistics
- REST API
- All web UI features
- Electrum backend support (via Fulcrum BCH)

## Contributing

Contributions are welcome. Please open an issue or pull request on the [GitHub repository](https://github.com/CyberAshven/bch-explorer-startos).

For build instructions, see the [Makefile](Makefile) and [s9pk.mk](s9pk.mk).

---

## Quick Reference for AI Consumers

```yaml
package_id: bch-explorer
upstream_version: 3.7.8
images:
  frontend: ghcr.io/cyberashven/bch-explorer-frontend:3.7.8
  backend: ghcr.io/cyberashven/bch-explorer-backend:3.7.8
  db: mariadb:10.4.32
architectures: [x86_64]
volumes:
  main: /backend/cache (cache data)
  db: /var/lib/mysql (MariaDB)
ports:
  ui: 8080
  api: 8999 (internal)
  db: 3306 (internal)
dependencies:
  - bitcoin-cash-node (required, version >=29.0.0:0)
  - fulcrum-bch (optional, electrum index)
health_checks:
  - db: port_listening 3306
  - api: port_listening 8999
  - web: port_listening 8080
backup_strategy: volume rsync (main, db)
```
