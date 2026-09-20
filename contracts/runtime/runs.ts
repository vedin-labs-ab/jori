export const runStatuses = [
  "queued",
  "running",
  "completed",
  "failed",
  "stopped",
] as const

export type RunStatus = (typeof runStatuses)[number]

export const runActivityKinds = [
  "agent",
  "approval",
  "file",
  "model",
  "offer",
  "run",
  "tool",
  "wait",
] as const

export type RunActivityKind = (typeof runActivityKinds)[number]

export function isTerminalRunStatus(status: RunStatus) {
  return status === "completed" || status === "failed" || status === "stopped"
}

/** Model turns a run may take before it is failed as looping. */
export const maxRunTurns = 30
