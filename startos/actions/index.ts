import { sdk } from '../sdk'
import { selectIndexer } from './selectIndexer'
import { selectNode } from './selectNode'
import { repairMariaDb } from './repairMariaDb'

export const actions = sdk.Actions.of()
  .addAction(selectNode)
  .addAction(selectIndexer)
  .addAction(repairMariaDb)
