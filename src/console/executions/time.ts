import { type ExecutionItem } from "./types"

const liveIntervalMs = 1000
const settledIntervalMs = 60_000

export function executionClockInterval(
  executions: ExecutionItem[],
  now: number
) {
  return executions.some((execution) => needsLiveClock(execution, now))
    ? liveIntervalMs
    : settledIntervalMs
}

export function displayNowForExecution(execution: ExecutionItem, now: number) {
  if (needsLiveClock(execution, now)) {
    return now
  }

  return Math.floor(now / settledIntervalMs) * settledIntervalMs
}

function needsLiveClock(execution: ExecutionItem, now: number) {
  return (
    execution.status === "queued" ||
    execution.status === "running" ||
    (execution.approval !== null &&
      execution.approval.state === "pending" &&
      execution.approval.expiresAt > now)
  )
}
