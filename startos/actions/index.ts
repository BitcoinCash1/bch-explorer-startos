import { sdk } from '../sdk'
import { repairMariaDb } from './repairMariaDb'
import { selectNode } from './selectNode'

export const actions = sdk.Actions.of()
  .addAction(selectNode)
  .addAction(repairMariaDb)
