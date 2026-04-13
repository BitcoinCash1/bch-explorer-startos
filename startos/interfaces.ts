import { sdk } from './sdk'
import { webPort, webInterfaceId } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const webMulti = sdk.MultiHost.of(effects, 'main')
  const webOrigin = await webMulti.bindPort(webPort, {
    protocol: 'http',
    preferredExternalPort: webPort,
  })

  const web = sdk.createInterface(effects, {
    name: 'Web UI',
    id: webInterfaceId,
    description: 'BCH Explorer web interface — browse blocks, transactions, and addresses',
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  return [await webOrigin.export([web])]
})
