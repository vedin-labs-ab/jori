import { type RuntimeId } from "./ids"

export const runStatuses = [
  "queued",
  "running",
  "completed",
  "failed",
  "stopped",
] as const

export type RunStatus = (typeof runStatuses)[number]

export function isTerminalRunStatus(status: RunStatus) {
  return status === "completed" || status === "failed" || status === "stopped"
}

/** What a parent sees of a child run it delegated to. */
export type AgentRunStatus = {
  runId: RuntimeId<"runs">
  title: string
  status: RunStatus
  error: string | null
  /** Outcome the child returned via finish_run; null until it completes. */
  result: string | null
}

/** Model turns a run may take before it is failed as looping. */
export const maxRunTurns = 30
