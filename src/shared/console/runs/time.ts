import { useEffect, useState } from "react"
import { type ExecutionItem } from "./types"

const liveIntervalMs = 1000
const settledIntervalMs = 60_000

/** The page's clock: to the second while any run on it is live, to the
 *  minute otherwise. */
export function useExecutionClock(runs: ExecutionItem[]) {
  const [now, setNow] = useState(() => Date.now())
  const intervalMs = runClockInterval(runs, now)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), intervalMs)

    return () => window.clearInterval(interval)
  }, [intervalMs])

  return now
}

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
    run.approvals.some(
      (approval) => approval.state === "pending" && approval.expiresAt > now
    ) ||
    run.offers.some(
      (offer) =>
        (offer.state === "pending" || offer.state === "claimed") &&
        offer.expiresAt > now
    )
  )
}
