import { sdk } from '../sdk'
import { repairMariaDb } from './repairMariaDb'
import { selectIndexer } from './selectIndexer'
import { selectNode } from './selectNode'

export const actions = sdk.Actions.of()
  .addAction(selectNode)
  .addAction(selectIndexer)
  .addAction(repairMariaDb)
