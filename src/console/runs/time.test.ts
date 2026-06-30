import { describe, expect, test } from "vitest"
import { displayNowForRun, runClockInterval } from "./time"
import { type ExecutionItem } from "./types"

const baseRun: ExecutionItem = {
  approval: null,
  createdAt: 1700000000123,
  details: [],
  durationMs: 1200,
  endedAt: 1700000001323,
  id: "run-1",
  searchableText: "completed run",
  source: { type: "manual" },
  status: "completed",
  task: "Completed run",
  title: "Completed run",
  trigger: "Manual",
  waiter: null,
}

describe("run clock timing", () => {
  test("uses a minute interval for settled runs", () => {
    expect(runClockInterval([baseRun], 1700000065123)).toBe(60_000)
  })

  test("uses a second interval while a run is active", () => {
    expect(
      runClockInterval(
        [{ ...baseRun, endedAt: undefined, status: "running" }],
        1700000065123
      )
    ).toBe(1000)
  })

  test("uses a second interval while a pending approval is live", () => {
    expect(
      runClockInterval(
        [
          {
            ...baseRun,
            approval: {
              decidedAt: undefined,
              delivery: undefined,
              expiresAt: 1700000066000,
              id: "approval-1",
              surface: "slack",
              source: undefined,
              state: "pending",
              summary: "Approve this run",
              tool: "slack.postMessage",
              toolLabel: "Post Slack message",
            },
          },
        ],
        1700000065123
      )
    ).toBe(1000)
  })

  test("uses a second interval while a waiter is active", () => {
    expect(
      runClockInterval(
        [
          {
            ...baseRun,
            waiter: {
              expiresAt: 1700001800000,
              id: "waiter-1",
              state: "waiting",
            },
          },
        ],
        1700000065123
      )
    ).toBe(1000)
  })

  test("buckets display time for settled runs", () => {
    expect(displayNowForRun(baseRun, 1700000065123)).toBe(1700000040000)
  })
})
