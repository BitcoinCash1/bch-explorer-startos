# TODO

- [ ] `fulcrum-bch` is a required dependency but is published to no registry, so
      BCH Explorer cannot yet be installed from one. It needs its own review and
      release before this package can ship.
- [ ] Ask `bitcoin-cash-node-startos` to export `rpcHostId` from
      `startos/utils.ts` the way BCHD and Flowee do, and drop the `'rpc'` literal
      in `startos/utils.ts`.
- [ ] The runtime image patches in `startos/shims.ts` are carried over from the
      upstream packager and have not been re-verified against the current images.
      Confirm each one still matches — a stale pattern removes its fix silently.
- [ ] Verify on hardware: install against BCHN and against Flowee, confirm health
      goes green, the Web UI serves, and switching the node's chain restarts the
      explorer onto a separate database.
