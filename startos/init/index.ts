import { sdk } from '../sdk'
import { setDependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { versionGraph } from '../versions'
import { actions } from '../actions'
import { restoreInit } from '../backups'
import { seedFiles } from './seedFiles'
import { taskSelectIndexer } from './taskSelectIndexer'
import { taskSelectNode } from './taskSelectNode'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  seedFiles,
  setInterfaces,
  setDependencies,
  actions,
  taskSelectNode,
  taskSelectIndexer,
)

export const uninit = sdk.setupUninit(versionGraph)
