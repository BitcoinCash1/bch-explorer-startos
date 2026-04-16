import { VersionGraph } from '@start9labs/start-sdk'
import { v_3_8_3_0 } from './v3.8.3.0'
import { v_3_7_10_1 } from './v3.7.10.1'
import { v_3_7_10_0 } from './v3.7.10.0'
import { v_3_7_8_0 } from './v3.7.8.0'

export const versionGraph = VersionGraph.of({
  current: v_3_8_3_0,
  other: [v_3_7_10_1, v_3_7_10_0, v_3_7_8_0],
})
