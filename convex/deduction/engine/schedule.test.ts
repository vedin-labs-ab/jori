import { describe, expect, test } from "vitest"
import {
  bootstrapChunkMs,
  bootstrapWindowMs,
  consolidationCadenceMs,
  minPassWindowMs,
  passCadenceMs,
  staleRunningMultiplier,
} from "../limits"
import {
  isPassDue,
  isStaleRunning,
  nextPassWindow,
  stageTiming,
} from "./schedule"

const now = 1_000_000_000_000

describe("stage timing", () => {
  test("only the effort stage chunks its bootstrap", () => {
    expect(stageTiming("effort", "window")).toEqual({
      cadenceMs: passCadenceMs,
      chunked: true,
    })
    expect(stageTiming("workstream", "window")).toEqual({
      cadenceMs: passCadenceMs,
      chunked: false,
    })
  })

  test("full scope runs on the consolidation cadence", () => {
    expect(stageTiming("workstream", "full")).toEqual({
      cadenceMs: consolidationCadenceMs,
      chunked: false,
    })
  })
})

describe("pass windows", () => {
  test("a chunked bootstrap starts one chunk at the backfill horizon", () => {
    expect(nextPassWindow(now, undefined, true)).toEqual({
      start: now - bootstrapWindowMs,
      end: now - bootstrapWindowMs + bootstrapChunkMs,
    })
  })

  test("a chunked bootstrap walks forward until caught up", () => {
    const first = nextPassWindow(now, undefined, true)
    const second = nextPassWindow(now, first?.end, true)

    expect(second?.start).toBe(first?.end)
    expect(nextPassWindow(now, now - passCadenceMs, true)).toEqual({
      start: now - passCadenceMs,
      end: now,
    })
  })

  test("an unchunked window swallows the whole backlog at once", () => {
    expect(nextPassWindow(now, undefined, false)).toEqual({
      start: now - bootstrapWindowMs,
      end: now,
    })
  })

  test("a too-small remaining window yields no pass", () => {
    expect(nextPassWindow(now, now - minPassWindowMs + 1, true)).toBeNull()
    expect(nextPassWindow(now, now, false)).toBeNull()
  })
})

describe("pass due checks", () => {
  test("no pass yet is due", () => {
    expect(isPassDue(now, undefined, passCadenceMs)).toBe(true)
  })

  test("a caught-up stage rests one cadence from its window end", () => {
    expect(isPassDue(now, donePass(now - passCadenceMs), passCadenceMs)).toBe(
      true
    )
    expect(isPassDue(now, donePass(now - 1), passCadenceMs)).toBe(false)
  })

  test("a backlog is due again immediately", () => {
    const chunk = donePass(now - bootstrapWindowMs + bootstrapChunkMs)

    expect(isPassDue(now, chunk, passCadenceMs)).toBe(true)
    expect(isPassDue(now, chunk, consolidationCadenceMs)).toBe(true)
  })

  test("a weekly cadence is not due after an hour", () => {
    expect(
      isPassDue(now, donePass(now - passCadenceMs), consolidationCadenceMs)
    ).toBe(false)
    expect(
      isPassDue(
        now,
        donePass(now - consolidationCadenceMs),
        consolidationCadenceMs
      )
    ).toBe(true)
  })

  test("running passes block until stale on the hourly bound", () => {
    const staleAt = now - staleRunningMultiplier * passCadenceMs

    expect(isPassDue(now, runningPass(now - 1), passCadenceMs)).toBe(false)
    expect(isPassDue(now, runningPass(staleAt), passCadenceMs)).toBe(true)
    expect(isStaleRunning(now, { startedAt: staleAt })).toBe(true)
    expect(isStaleRunning(now, { startedAt: staleAt + 1 })).toBe(false)
  })
})

function donePass(windowEnd: number) {
  return {
    status: "completed",
    startedAt: windowEnd,
    window: { end: windowEnd },
  }
}

function runningPass(startedAt: number) {
  return { status: "running", startedAt, window: { end: startedAt } }
}
