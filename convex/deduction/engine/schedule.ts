import {
  bootstrapChunkMs,
  bootstrapWindowMs,
  consolidationCadenceMs,
  minPassWindowMs,
  passCadenceMs,
  staleRunningMultiplier,
} from "../limits"
import { type PassScope, type PassStage } from "../schema"

type PassWindow = { start: number; end: number }

// Only the effort stage reads raw activity in volume, so only it walks the
// bootstrap in chunks; belief stages read the bounded effort layer and can
// swallow any window whole.
export function stageTiming(stage: PassStage, scope: PassScope) {
  return {
    cadenceMs: scope === "full" ? consolidationCadenceMs : passCadenceMs,
    chunked: stage === "effort",
  }
}

// The next window. Bootstrap starts bootstrapWindowMs back and, when chunked,
// walks forward one chunk at a time until caught up; steady state is one
// window ending now. Null when the remaining window is too small to be worth
// a pass.
export function nextPassWindow(
  now: number,
  lastCompletedEnd: number | undefined,
  chunked: boolean
): PassWindow | null {
  const start = lastCompletedEnd ?? now - bootstrapWindowMs
  const end = chunked ? Math.min(now, start + bootstrapChunkMs) : now

  return end - start < minPassWindowMs ? null : { start, end }
}

// Cadence measures from the last reviewed window's end, not from wall-clock
// start: a caught-up stage rests one cadence, while a backlog (bootstrap
// chunks, downtime) is due again immediately.
export function isPassDue(
  now: number,
  latest:
    | { status: string; startedAt: number; window: { end: number } }
    | undefined,
  cadenceMs: number
) {
  if (latest === undefined) {
    return true
  }

  if (latest.status === "running") {
    return isStaleRunning(now, latest)
  }

  return now - latest.window.end >= cadenceMs
}

// A running pass whose action died would block its organization and stage forever;
// after two hourly cadences it is presumed dead and failed by the next
// opener. Judge calls finish in minutes, so the bound holds for every scope.
export function isStaleRunning(now: number, pass: { startedAt: number }) {
  return now - pass.startedAt >= staleRunningMultiplier * passCadenceMs
}
