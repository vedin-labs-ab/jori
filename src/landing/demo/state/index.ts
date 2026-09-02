import { demoFolders } from "../fixtures/folders"
import { demoJobs } from "../fixtures/jobs"
import { demoMaterials } from "../fixtures/materials"
import { demoRuns } from "../fixtures/runs"
import { demoActivity } from "../fixtures/runs/activity"
import { demoShares } from "../fixtures/shares"
import { demoUsage } from "../fixtures/usage"
import { reduceAccess } from "./access"
import { reduceFolders } from "./folders"
import { reduceJobs } from "./jobs"
import { reduceMaterials } from "./materials"
import { reduceRuns } from "./runs"
import { reduceTables } from "./tables"
import { type DemoAction, type DemoState } from "./types"

export type { DemoAction, DemoState, VisibilityTarget } from "./types"

/** Copperline as the page first shows it, with every time an offset from
 *  the moment the page was rendered. */
export function createWorkspace(now: number): DemoState {
  return {
    activity: demoActivity(now),
    folders: demoFolders(now),
    jobs: demoJobs(now),
    materials: demoMaterials(now),
    now,
    runs: demoRuns(now),
    shares: demoShares(now),
    usage: demoUsage(now),
  }
}

const reducers = [
  reduceAccess,
  reduceFolders,
  reduceJobs,
  reduceMaterials,
  reduceRuns,
  reduceTables,
]

/** Each domain answers for its own actions and leaves the rest alone. */
export function reduceWorkspace(
  state: DemoState,
  action: DemoAction
): DemoState {
  return reducers.reduce((current, reduce) => reduce(current, action), state)
}
