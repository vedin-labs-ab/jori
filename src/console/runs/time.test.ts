import { describe, expect, test } from "vitest"
import { makeApproval, makeExecution, makeOffer } from "./fixtures"
import { displayNowForRun, runClockInterval } from "./time"
import { type ExecutionItem } from "./types"

const baseRun = makeExecution({
  createdAt: 1700000000123,
  durationMs: 1200,
  endedAt: 1700000001323,
  id: "run-1" as ExecutionItem["id"],
  searchableText: "completed run",
  source: { type: "manual" },
  task: "Completed run",
  title: "Completed run",
  trigger: "Manual",
})

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
    const approval = makeApproval({
      decidedAt: undefined,
      expiresAt: 1700000066000,
      state: "pending",
      summary: "Approve this run",
      tool: "slack.postMessage",
      toolLabel: "Post Slack message",
    })

    expect(
      runClockInterval(
        [
          {
            ...baseRun,
            approval,
            approvals: [approval],
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
              id: "waiter-1" as NonNullable<ExecutionItem["waiter"]>["id"],
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

test("uses a second interval while a pending offer is live", () => {
  const offer = makeOffer({
    expiresAt: 1700000066000,
    summary: "Connect Notion so Jori can continue.",
    updatedAt: 1700000000000,
  })

  expect(
    runClockInterval(
      [
        {
          ...baseRun,
          offer,
          offers: [offer],
        },
      ],
      1700000065123
    )
  ).toBe(1000)
})
