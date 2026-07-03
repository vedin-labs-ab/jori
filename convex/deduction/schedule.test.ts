import { describe, expect, test } from "vitest"
import {
  bootstrapChunkMs,
  bootstrapWindowMs,
  minPassWindowMs,
  passCadenceMs,
  staleRunningMultiplier,
} from "./limits"
import { isPassDue, isStaleRunning, nextPassWindow } from "./schedule"

const now = 1_000_000_000_000

describe("pass windows", () => {
  test("bootstrap starts one chunk at the backfill horizon", () => {
    expect(nextPassWindow(now, undefined)).toEqual({
      start: now - bootstrapWindowMs,
      end: now - bootstrapWindowMs + bootstrapChunkMs,
    })
  })

  test("bootstrap walks forward chunk by chunk until caught up", () => {
    const first = nextPassWindow(now, undefined)
    const second = nextPassWindow(now, first?.end)

    expect(second?.start).toBe(first?.end)
    expect(nextPassWindow(now, now - passCadenceMs)).toEqual({
      start: now - passCadenceMs,
      end: now,
    })
  })

  test("a too-small remaining window yields no pass", () => {
    expect(nextPassWindow(now, now - minPassWindowMs + 1)).toBeNull()
    expect(nextPassWindow(now, now)).toBeNull()
  })
})

describe("pass due checks", () => {
  test("no pass yet is due", () => {
    expect(isPassDue(now, undefined)).toBe(true)
  })

  test("completed or failed passes are due after one cadence", () => {
    const startedAt = now - passCadenceMs

    expect(isPassDue(now, { status: "completed", startedAt })).toBe(true)
    expect(isPassDue(now, { status: "failed", startedAt })).toBe(true)
    expect(isPassDue(now, { status: "completed", startedAt: now - 1 })).toBe(
      false
    )
  })

  test("running passes block until stale", () => {
    const staleAt = now - staleRunningMultiplier * passCadenceMs

    expect(isPassDue(now, { status: "running", startedAt: now - 1 })).toBe(
      false
    )
    expect(isPassDue(now, { status: "running", startedAt: staleAt })).toBe(true)
    expect(isStaleRunning(now, { startedAt: staleAt })).toBe(true)
    expect(isStaleRunning(now, { startedAt: staleAt + 1 })).toBe(false)
  })
})
