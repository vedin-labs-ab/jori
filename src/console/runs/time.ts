import { type ExecutionItem } from "./types"

const liveIntervalMs = 1000
const settledIntervalMs = 60_000

export function runClockInterval(runs: ExecutionItem[], now: number) {
  return runs.some((run) => needsLiveClock(run, now))
    ? liveIntervalMs
    : settledIntervalMs
}

export function displayNowForRun(run: ExecutionItem, now: number) {
  if (needsLiveClock(run, now)) {
    return now
  }

  return Math.floor(now / settledIntervalMs) * settledIntervalMs
}

function needsLiveClock(run: ExecutionItem, now: number) {
  return (
    run.status === "queued" ||
    run.status === "running" ||
    run.waiter?.state === "waiting" ||
    (run.approval !== null &&
      run.approval.state === "pending" &&
      run.approval.expiresAt > now)
  )
}
