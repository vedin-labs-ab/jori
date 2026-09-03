import { type RunStatus } from "../runs"
import { type RuntimeId } from "./ids"

export type AgentRunStatus = {
  runId: RuntimeId<"runs">
  title: string
  status: RunStatus
  error: string | null
  /** Outcome the child returned via finish_run; null until it completes. */
  result: string | null
}
