import { describe, expect, test } from "vitest"
import { displayNowForExecution, executionClockInterval } from "./time"
import { type ExecutionItem } from "./types"

const baseExecution: ExecutionItem = {
  approval: null,
  createdAt: 1700000000123,
  details: [],
  durationMs: 1200,
  finishedAt: 1700000001323,
  id: "run-1",
  searchableText: "completed run",
  source: { type: "manual", metadata: [] },
  status: "completed",
  task: "Completed run",
  title: "Completed run",
  trigger: "Manual",
}

describe("execution clock timing", () => {
  test("uses a minute interval for settled executions", () => {
    expect(executionClockInterval([baseExecution], 1700000065123)).toBe(60_000)
  })

  test("uses a second interval while an execution is active", () => {
    expect(
      executionClockInterval(
        [{ ...baseExecution, finishedAt: undefined, status: "running" }],
        1700000065123
      )
    ).toBe(1000)
  })

  test("uses a second interval while a pending approval is live", () => {
    expect(
      executionClockInterval(
        [
          {
            ...baseExecution,
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

  test("buckets display time for settled executions", () => {
    expect(displayNowForExecution(baseExecution, 1700000065123)).toBe(
      1700000040000
    )
  })
})
