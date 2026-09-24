import { i18n } from './i18n'
import { sdk } from './sdk'
import { webHostId, webInterfaceId, webPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const webMulti = sdk.MultiHost.of(effects, webHostId)
  const webOrigin = await webMulti.bindPort(webPort, {
    protocol: 'http',
    preferredExternalPort: webPort,
  })

  const web = sdk.createInterface(effects, {
    name: i18n('Web UI'),
    id: webInterfaceId,
    description: i18n(
      'Browse Bitcoin Cash blocks, transactions, addresses and the mempool',
    ),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  return [await webOrigin.export([web])]
})
