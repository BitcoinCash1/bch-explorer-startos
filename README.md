<p align="center">
  <img src="icon.png" alt="BCH Explorer Logo" width="21%">
</p>

# BCH Explorer on StartOS

> Everything not listed in this document should behave the same as upstream
> BCH Explorer. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[BCH Explorer](https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer) is a block explorer for Bitcoin Cash: blocks, transactions, addresses, the mempool, and mining statistics. This package runs it against your own node and indexer, and patches the published images at start to work with the three Bitcoin Cash nodes their upstream does not support.

- **Upstream repo:** <https://gitlab.melroy.org/bitcoincash/bitcoin-cash-explorer>
- **Wrapper repo:** <https://github.com/Start9-Community/bch-explorer-startos>

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Upstream Updates](#upstream-updates)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

Three images: the two halves of the explorer, and a MariaDB sidecar.

| Property      | Value                                             |
| ------------- | ------------------------------------------------- |
| Images        | The upstream frontend and backend, plus `mariadb` |
| Architectures | x86_64 natively; **aarch64 by emulation**         |
| Command       | Each image's own entrypoint                       |

| Subcontainer | Purpose                                     |
| ------------ | ------------------------------------------- |
| `api-sub`    | The backend — attach here for explorer logs |
| `web-sub`    | The frontend, an nginx-served bundle        |
| `db-sub`     | MariaDB, private to this service            |

**The explorer images are published for x86_64 only**, so on ARM they run under emulation. That is slower, and it is why they cannot simply be rebuilt here.

**Because they cannot be rebuilt, they are patched at start.** The backend is a published artifact, so each fix is applied in place before its daemon launches, and every patch is written to no-op when its pattern is absent — so a fix upstream has since made unnecessary costs nothing rather than breaking the start.

What those patches cover is worth knowing, because it is the reason this package exists at all: the upstream explorer targets one node implementation, and the other two answer differently. The patches reconcile the RPC dialect — a block's transactions under a different key, a missing transaction count, statistics and chain-tip calls that are simply unimplemented, a two-argument raw-transaction call, an address validation that omits the field the Electrum path needs, and mempool entries missing the fields the frontend renders.

**The backend also refuses to start while its PID file exists**, so its command removes a stale one and kills any process still holding the port before launching — otherwise one crash wedges every restart after it.

## Volume and Data Layout

Two volumes, plus a read-only view of the selected node's.

| Volume                 | Mount Point      | Purpose                                     |
| ---------------------- | ---------------- | ------------------------------------------- |
| `main`                 | `/backend/cache` | The backend's cache, at a subpath           |
| `db`                   | `/var/lib/mysql` | MariaDB's data — **at a per-chain subpath** |
| The node's `main` (ro) | `/mnt/node`      | The node's own store                        |

**Each chain gets its own database directory.** The `db` volume is mounted at a subpath named for the chain, so switching chains does not mix one chain's indexed data into another's — and switching back finds the earlier index still there.

**The node's volume is mounted for its store, not for chain data.** The explorer never reads the chain from disk — what it needs from that mount is which chain the node is on and, for two of the three nodes, the RPC credentials published there.

**The cache directory is made world-writable at start**, because the mounted subpath arrives with restrictive ownership and the backend runs unprivileged. It is visible only inside that container.

## File Models

One model, holding what StartOS contributes.

| File         | Format | Modelled                | Written by       |
| ------------ | ------ | ----------------------- | ---------------- |
| `store.json` | JSON   | Yes — `FileHelper.json` | Init and actions |

It holds the database password, the node selection and whether it has been confirmed, and the Flowee credential.

Everything the explorer itself reads is **passed as environment**, composed at start — the chain, the node's address and credentials, the indexer's address, and the frontend's per-chain switches.

**One backend serves one chain.** The frontend's per-chain switches are set so that only the selected chain is enabled and the interface is pinned to it, rather than offering a chain selector whose other entries would have no backend behind them.

## Dependencies

Five declared: an indexer that is always required, and four nodes of which **exactly one** is active.

| Dependency          | Required         | Health checks required                      | Why                         |
| ------------------- | ---------------- | ------------------------------------------- | --------------------------- |
| Fulcrum BCH         | **Yes**          | `primary`, `sync-progress`                  | Address and history lookups |
| Bitcoin Cash Node   | Only if selected | `primary`, `sync-progress`                  | Blocks and transactions     |
| Bitcoin Cash Daemon | Only if selected | `primary`, `sync-progress`, `rpc-plaintext` | The same                    |
| Flowee the Hub      | Only if selected | `primary`, `sync-progress`                  | The same                    |
| Knuth               | Only if selected | `primary`, `sync-progress`                  | The same                    |

**Unlike its sibling mining packages, these are gated on being synced.** An explorer showing a partial chain is showing wrong answers, not late ones.

**Bitcoin Cash Daemon needs a third check**, because it serves RPC over its own TLS which the explorer backend cannot speak — so it is dialed through that package's plaintext proxy, and the proxy is a binding that has to be up in its own right.

**The node needs configuring, and the package asks for it.** The explorer looks up arbitrary transactions, which requires a full transaction index — and on one node an unpruned chain as well. So selecting a node raises a `critical` task **on that node**, pre-filled and locked to exactly those settings, recurring rather than one-shot so turning the index off later brings the prompt back. On Knuth the task turns JSON-RPC on and sets the full database mode instead, since Knuth serves RPC only when enabled and keeps transaction data only in that mode.

**Flowee is handled differently**, and deliberately: it keeps only a hash of each RPC password and cannot report its current input, so a recurring "does the input match" task would re-appear forever no matter how many times it was answered. Its credential task is raised once by the node-selection action instead.

Switching nodes clears the tasks belonging to the ones you left.

## Network Access and Interfaces

One interface.

| Interface | Id    | Type | Port | Description  |
| --------- | ----- | ---- | ---- | ------------ |
| Web UI    | `web` | ui   | 8080 | The explorer |

Bound on the `main` MultiHost over HTTP and not masked.

**There is no login**, and the content is public blockchain data. The backend and the database are internal to the service and are not exported — the frontend reaches the backend over the service's own loopback, and MariaDB is bound to loopback explicitly.

## Installation and First-Run Flow

Install generates the database password and raises a `critical` task: choose the node.

Confirming that choice raises the second task, on the node itself, asking it to enable the transaction index. **Answering it restarts the node**, and on a node that was not already indexing, the index has to be built before the explorer can answer arbitrary lookups.

Fulcrum BCH must also be installed and synced. Until it is, the explorer runs but address and transaction history are unavailable — which is reported in the logs rather than by refusing to start.

**A node that is not yet reachable is not fatal either.** The explorer starts with its node address unset rather than dialing something that cannot answer, and the reactive read connects it the moment the node appears.

**A chain the explorer has no frontend for is fatal**, and that is the one case where the start does throw: there is nothing sensible to render.

## Actions

Two actions.

### Select Node Backend

Chooses which of the four Bitcoin Cash nodes the explorer reads from.

- **What it changes:** the selection, and through it the dependency, the mount, the RPC address, and which node-side task is raised.
- **Cost:** the explorer restarts.
- **Choosing Flowee raises its credential task** from here rather than from the dependency declaration — see [Dependencies](#dependencies).

### Repair MariaDB

Deletes MariaDB's transaction-coordinator log and restarts.

- **For one specific failure**: a database that crash-loops after an unclean shutdown or a full disk, reporting a bad magic header in that log.
- **Indexed explorer data is kept.** Only the coordinator log is removed.
- **A StartOS rebuild does not remove that file**, which is why this action exists at all.
- **Runnable at any status.**

## Tasks

Up to three, and two of them land on another package.

| Task                | Raised on       | Severity   | Raised when                   | Cleared when              |
| ------------------- | --------------- | ---------- | ----------------------------- | ------------------------- |
| Select Node Backend | This package    | `critical` | Install                       | The action runs           |
| Auto-Configure      | The chosen node | `critical` | Its required settings are off | Its configuration matches |
| Register credential | `flowee`        | `critical` | Flowee is selected            | Flowee registers it       |

The node-side configuration task is **recurring**: it re-raises whenever the node's settings stop matching, so turning the transaction index off later is noticed rather than silently breaking lookups.

## Health Checks

Three checks, one per daemon.

| Check | Displayed as | Method                                    |
| ----- | ------------ | ----------------------------------------- |
| `db`  | "Database"   | The database port is listening            |
| `api` | "API"        | The backend's port, then the node's chain |
| `web` | "Web UI"     | The frontend's port is listening          |

The chain runs in order — the frontend waits for the backend, which waits for the database — so a failure at the bottom shows as the layers above never starting.

**The API check does double duty, and the second job is the interesting one.** Once the backend is up, each poll re-reads which chain the node is on and restarts the service if it has moved. That check is the only thing that can notice: the node's chain lives in a file, which is not a reactive source, and on two of the three nodes the RPC port does not move with the chain either — so the address gives no signal.

## Backups and Restore

**The index is not backed up. Only the settings are.**

Everything in the explorer's database is derived from the node and the indexer, and it is the entire bulk of what this service stores — so the `db` volume is left out of the backup altogether and a restored install rebuilds it. That is the same trade Fulcrum and electrs make with their own indexes.

What is kept is `store.json`, on the `main` volume: the node selection, and **the credential registered on Flowee**. That credential is the reason this backup is not empty — it is minted here and registered on the Flowee side, so losing it would mean answering Flowee's registration task again. The backend's own cache is excluded alongside the index, being derived too.

**A restored explorer comes back configured and immediately begins re-indexing**, exactly as a fresh install does. Backups are correspondingly small and quick.

## Limitations and Differences

1. **x86_64 is native; ARM is emulated.** The upstream images are published for one architecture only.
2. **The images are patched at start**, because they cannot be rebuilt here. Each patch no-ops if upstream has fixed the underlying difference.
3. **One chain at a time.** The frontend is pinned to the node's chain and the other selectors are disabled.
4. **Regtest is not supported** — the explorer has no frontend for it, and the start fails rather than rendering nothing.
5. **A full transaction index is required on the node**, and on one of them an unpruned chain as well.
6. **Both the node and the indexer must be synced**, not merely running.
7. **No authentication.** The explorer is public data, but it is also a window onto which chain you run.
8. **Some frontend content is fetched from upstream's own service**, including historical prices and the services endpoint baked into the image's configuration.
9. **The index is not backed up**, by design — a restore re-indexes from the node.

---

## Upstream Updates

When upstream publishes a release, its pipeline sends this repository a `repository_dispatch`, which runs `check-upstream.yml` (it can also be run by hand with a tag). The workflow copies that release's frontend and backend images from Melroy's registry to GHCR, where the manifest pins them, then `scripts/auto-bump.sh` sets `startos/versions/current.ts` to `<upstream>:0`, resets `ALLOW_DOWNGRADE` to `false`, updates the image tags in the manifest, and opens a pull request from `auto-bump/v<tag>`. A tag older than the packaged version is refused. Nothing reaches `master` until that PR is reviewed and merged; merging it is what releases the new version. Package-only fixes bump the revision after the colon by hand in their own PR.

## Quick Reference for AI Consumers

```yaml
package_id: bch-explorer
image: ghcr.io/bitcoincash1/bch-explorer-frontend # plus -backend and mariadb
architectures:
  - x86_64 # aarch64 via emulateMissingAs
subcontainers:
  - api-sub # backend; patched in place at start
  - web-sub # frontend, nginx
  - db-sub # MariaDB, bound to 127.0.0.1
volumes:
  main: /backend/cache # mounted at a subpath; chmod 777 at start for the unprivileged backend
  db: /var/lib/mysql
  # the selected node's main volume is read-only at /mnt/node — for its store, not chain data
file_models:
  - store.json # dbPassword, nodePackageId, nodeConfirmed, flowee credentials
startos_managed_env_vars:
  - EXPLORER_BACKEND
  - EXPLORER_NETWORK
  - CORE_RPC_* # host, port and credentials; omitted while the node is unresolved
  - ELECTRUM_* # Fulcrum BCH's bridge address
  - MYSQL_* / MARIADB_*
  - '*_ENABLED / ROOT_NETWORK' # frontend chain switches; only the selected chain is on
dependencies:
  - fulcrum-bch # REQUIRED always; healthChecks: [primary, sync-progress]
  - bitcoincashd # only if selected; healthChecks: [primary, sync-progress]
  - bchd # only if selected; + rpc-plaintext, since the backend can't speak its TLS
  - flowee # only if selected; healthChecks: [primary, sync-progress]
  - knuth-bch # only if selected; healthChecks: [primary, sync-progress]
interfaces:
  web: { type: ui, port: 8080 } # no authentication; backend and db are internal
actions:
  - select-node
  - repair-mariadb # deletes tc.log only; a StartOS rebuild does not
tasks:
  - { action: select-node, severity: critical } # install
  - { on: <chosen node>, action: autoconfig, severity: critical, once: false } # txindex
  - { on: flowee, action: create-dependent-credential, severity: critical } # from the action
health_checks:
  - db # displayed "Database"
  - api # displayed "API"; also re-reads the node's chain and restarts on a change
  - web # displayed "Web UI"
```
