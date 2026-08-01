# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (architecture, for developers and LLMs) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **Package id is `bch-explorer`.** Three subcontainers: `api-sub` (the explorer backend), `web-sub` (the nginx frontend) and `db-sub` (a MariaDB sidecar the backend reaches on `127.0.0.1:3306`). The frontend and backend images are prebuilt upstream and cannot be rebuilt here.
- **The images are patched at runtime, in `startos/shims.ts`.** Backend patches are regex replacements applied with `node -e`; frontend patches are `sed`/`awk` run against the nginx config and the Angular chunks. **Every one of them no-ops silently when its pattern stops matching** — an upstream rename removes the fix rather than failing the build. Treat the payloads as verbatim upstream-packager code: they are moved, not rewritten. `UPDATING.md` says to re-check them on every bump.
- **The chain follows the node, and is never configured here.** `main.ts` reads the selected node's own `store.json` off its read-only `/mnt/node` mount for the chain and — on BCHN and BCHD — the RPC credentials. `explorerNetwork()` in `startos/utils.ts` maps the node's spelling (`testnet3`) onto the frontend's (`testnet`); regtest maps to nothing and fails the service deliberately. The chain drives the `db` volume subpath, `EXPLORER_NETWORK`, and the frontend's `*_ENABLED` toggles, so a chain change must restart `main`.
- **Dependencies are reached over the LXC bridge, never `.startos` DNS.** `startos/utils.ts` resolves each node's RPC and Fulcrum BCH's Electrum port through `sdk.host.getBridgeAddress(...).const()`. BCHN's RPC port moves per chain, so that `.const()` is also the chain-change signal for it; BCHD and Flowee pin one port for every chain, so the api daemon's health check re-reads the node's `store.json` and restarts on drift. BCHD must be dialed through its **plaintext proxy** binding (`rpc-plaintext`, 8334) — the explorer backend cannot speak TLS to `CORE_RPC`.
- **BCHN is the one dependency whose host id is a literal.** BCHD, Flowee and Fulcrum BCH all export their host ids and ports, and `startos/utils.ts` imports them; `bitcoin-cash-node-startos/startos/utils` exports `networkPorts` and the *interface* ids but no `rpcHostId`, so `'rpc'` is spelled out there. Exporting it upstream would remove the last literal.
- **Flowee's RPC credential is minted here, not read from Flowee.** Flowee stores only hashed `rpcauth` entries. `init/seedFiles.ts` mints a username and password into this package's `store.json` (once, and for existing installs too — not gated on `kind === 'install'`), and `actions/selectNode.ts` raises a critical task on Flowee (`create-dependent-credential`) to register it. That task belongs in the action, not `setupDependencies`: `input-not-matches` cannot judge a credential Flowee only stores hashed, so a task created on init would reappear every init no matter how often it was answered. Never expect to read a password back out of Flowee.

## Inspecting a running install

To run a command inside the service's container (read its generated config, grep app logs), use `start-cli package attach bch-explorer -n api-sub -- <cmd>`. Select the subcontainer by **name** with `-n` (the name passed to `SubContainer.of` in `main.ts` — `api-sub`, `web-sub` or `db-sub`) or by image with `-i`. Note: `-s/--subcontainer` matches the internal **Guid**, not the name, so passing a name to `-s` fails with "no matching subcontainers".
