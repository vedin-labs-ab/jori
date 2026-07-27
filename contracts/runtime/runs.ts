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
