import { VersionInfo } from '@start9labs/start-sdk'

export const v_3_11_13_4 = VersionInfo.of({
  version: '3.11.13:4',
  releaseNotes: 'Fix nginx crash: replace URI-in-proxy_pass with rewrite directives in regex location blocks (nginx forbids URI paths in proxy_pass inside regex locations). Also apply double-read of node store.json to handle LXC bind-mount propagation delay, matching the fix applied to Fulcrum in 2.1.1:7.',
  migrations: {
    up: async () => {},
    down: async () => {},
  },
})
