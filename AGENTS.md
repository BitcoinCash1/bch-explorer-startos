# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Freshly scaffolded? Work the
[New Package Checklist](../start-technologies/projects/start-sdk/docs/src/new-package-checklist.md)
(or <https://docs.start9.com/packaging/new-package-checklist.html>) from top to bottom. It is a
guide page, not a file in this repo — read it, don't copy it in.

Keep `README.md` (technical reference for an AI support or administering agent) and
`instructions.md` (end-user docs) in sync with your changes.

**Bugs and feature requests are GitHub issues on this repo** — file them as you find them.
Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **The frontend and backend images are prebuilt upstream and cannot be rebuilt here**, and are published for x86_64 only — aarch64 runs them under emulation via `emulateMissingAs`.
- **The chain follows the node, and is never configured here.** `main.ts` reads the selected node's own `store.json` off its read-only `/mnt/node` mount for the chain and — on BCHN and BCHD — the RPC credentials. `explorerNetwork()` in `startos/utils.ts` maps the node's spelling (`testnet3`) onto the frontend's (`testnet`); regtest maps to nothing and fails the service deliberately. The chain drives the `db` volume subpath, `EXPLORER_NETWORK`, and the frontend's `*_ENABLED` toggles, so a chain change must restart `main`.
- **Dependencies are reached over the LXC bridge, never `.startos` DNS.** `startos/utils.ts` resolves each node's RPC and Fulcrum BCH's Electrum port through `sdk.host.getBridgeAddress(...).const()`. BCHN's RPC port moves per chain, so that `.const()` is also the chain-change signal for it; BCHD and Flowee pin one port for every chain, so the api daemon's health check re-reads the node's `store.json` and restarts on drift. BCHD must be dialed through its **plaintext proxy** binding (`rpc-plaintext`, 8334) — the explorer backend cannot speak TLS to `CORE_RPC`.
- **Knuth is wired like BCHN.** `knuth-bch-startos/startos/utils` exports `networkPorts` and `rpcInterfaceId` (`'rpc'`), and its RPC port moves per chain, so its `.const()` bridge address is its chain-change signal too. The explorer treats it as a normal node: it requires `primary` and `sync-progress` and uses only Knuth's public exports and autoconfig inputs (JSON-RPC on, full database mode), never its internal daemons.
- **BCHN is the one dependency whose host id is a literal.** BCHD, Flowee and Fulcrum BCH all export their host ids and ports, and `startos/utils.ts` imports them; `bitcoin-cash-node-startos/startos/utils` exports `networkPorts` and the _interface_ ids but no `rpcHostId`, so `'rpc'` is spelled out there. Exporting it upstream would remove the last literal.
- **The api daemon's `ready` doubles as the chain-change detector.** BCHD and Flowee pin one RPC port on every chain, so the bridge address gives no signal, and the node's chain lives in a file rather than a reactive source — so each healthy poll re-reads it and restarts on drift. On BCHN the port does move per chain, so its `.const()` catches it too.
- **`main` throws only for a chain the explorer cannot render** (regtest). An unreachable node or indexer is a warning and an unset env var, not a failure — the `.const()` heals it.
- **The backend's `start.sh` refuses to run while its PID file exists**, so the daemon command removes a stale one and kills whatever still holds the API port before exec'ing. Without it, one crash wedges every subsequent restart.
- **`repair-mariadb` exists because a StartOS rebuild does not remove `tc.log`.** MariaDB crash-loops on a bad magic header in that file after an unclean shutdown or a full disk; the action deletes only that file and keeps the indexed data.

## Repository conventions

This repo is the original the Start9-Community copy is imported from. Keep it a
near-replica of that copy: every difference must be one of those listed below.

- **Syncing with Start9-Community:** `git merge` their `master` into ours, never
  rebase or force-push. Take their side for packaging, layout, docs and CI;
  keep only the deliberate differences below.
- **Branches:** `master` is released — every push to it runs Tag and Release.
  Work happens on short-lived branches and reaches `master` through a PR.
  `next` is kept on purpose: Start9's Sync Next workflow mirrors `master` into
  it, so do not delete it.
- **Versions:** `<upstream>:<revision>` in the single `startos/versions/current.ts`.
  Never change the upstream part by hand; a new upstream starts at `:0` (the
  auto-bump PR does this). Bump the revision once per shipped package change —
  not for docs, CI or archive changes. `ALLOW_DOWNGRADE` stays `false` unless a
  release is known to be reversible.
- **`assets/` vs `archive/`:** `assets/` is packed into the s9pk as a whole, so
  it holds only `.gitkeep` unless the service reads a file at runtime.
  `archive/` holds reference material (`ABOUT.md`, logos, picture variants) and
  is not packed. Never delete anything in `archive/`.
- **What StartOS shows:** name from `title` in `startos/manifest/index.ts`,
  description and About text from `short`/`long` in `startos/manifest/i18n.ts`,
  Instructions tab from `instructions.md` (required), logo from `icon.png`.
- **Commit and PR hygiene:** no session links, `Co-Authored-By` trailers or
  "Generated with" footers in commit messages, PR descriptions or comments.
  The Session Link Guard workflow fails any PR or push that carries one.
  Commits are authored by the maintainer, and all repository text (code
  comments, docs, commit messages, PR text) is written in the maintainer's
  voice, without naming the tools used to produce it.
- **Deliberate differences from Start9-Community:** newer upstream images (mirrored to GHCR by `check-upstream.yml` before `scripts/auto-bump.sh` opens the bump PR); Knuth (`knuth-bch`) as a fourth node backend; the `hex2ascii` shim also matching the backtick-quoted 3.14+ frontend build; `ALLOW_DOWNGRADE` in `current.ts`; `dependabot.yml`; `session-link-guard.yml`; `archive/` (including the dependency logos); the matching README/instructions notes. After an upstream bump, run every patch in `shims.ts` against the new images: a pattern that stops matching fails silently.
