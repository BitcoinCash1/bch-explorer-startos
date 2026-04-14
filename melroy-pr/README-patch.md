# Melroy MR: Add StartOS One-Click Installation

## Branch name: `add-startos-one-click-install`

## MR Title: Add StartOS as a one-click installation option

## MR Description:

BCH Explorer is now available as a one-click install on [StartOS](https://start9.com/).

The wrapper is maintained at [CyberAshven/bch-explorer-startos](https://github.com/CyberAshven/bch-explorer-startos) and packages your v3.7.10 Docker images (frontend + backend) alongside MariaDB into an `.s9pk` for StartOS.

**What it does:**
- Bundles `ghcr.io/cyberashven/bch-explorer-frontend:3.7.10` and `ghcr.io/cyberashven/bch-explorer-backend:3.7.10`
- Auto-connects to Bitcoin Cash Node (BCHN) for RPC and Fulcrum BCH for Electrum indexing — both also packaged for StartOS
- Zero manual configuration needed post-install

**Dependencies (also packaged for StartOS):**
- [bitcoin-cash-node-startos](https://github.com/CyberAshven/bitcoin-cash-node-startos) — BCHN v29.0.0
- [fulcrum-bch-startos](https://github.com/CyberAshven/fulcrum-bch-startos) — Fulcrum v2.1.0

---

## Exact README.md change:

Replace this section:

```markdown
~~BCH Explorer can be conveniently installed on the following full-node distros:~~

<!-- - [Umbrel](https://github.com/getumbrel/umbrel)
- [StartOS](https://github.com/Start9Labs/start-os)
- [nix-bitcoin](https://github.com/fort-nix/nix-bitcoin/blob/a1eacce6768ca4894f365af8f79be5bbd594e1c3/examples/configuration.nix#L129)
- [myNode](https://github.com/mynodebtc/mynode)
-->
```

With:

```markdown
BCH Explorer can be conveniently installed on the following full-node distros:

- [StartOS](https://github.com/CyberAshven/bch-explorer-startos) — self-hosted BCH Explorer on your Start9 server
```
