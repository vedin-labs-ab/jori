import {
  bootstrapChunkMs,
  bootstrapWindowMs,
  minPassWindowMs,
  passCadenceMs,
  staleRunningMultiplier,
} from "./limits"

export type PassWindow = { start: number; end: number }

// The next chunked window. Bootstrap starts bootstrapWindowMs back and walks
// forward one chunk at a time until caught up; steady state is one window
// ending now. Null when the remaining window is too small to be worth a pass.
export function nextPassWindow(
  now: number,
  lastCompletedEnd: number | undefined
): PassWindow | null {
  const start = lastCompletedEnd ?? now - bootstrapWindowMs
  const end = Math.min(now, start + bootstrapChunkMs)

  return end - start < minPassWindowMs ? null : { start, end }
}

export function isPassDue(
  now: number,
  latest: { status: string; startedAt: number } | undefined
) {
  if (latest === undefined) {
    return true
  }

  if (latest.status === "running") {
    return isStaleRunning(now, latest)
  }

  return now - latest.startedAt >= passCadenceMs
}

// A running pass whose action died would block its tenant and kind forever;
// after two cadences it is presumed dead and failed by the next opener.
export function isStaleRunning(now: number, pass: { startedAt: number }) {
  return now - pass.startedAt >= staleRunningMultiplier * passCadenceMs
}
