import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { expect, test, vi } from "vitest"
import { makeApproval, makeExecution, makeOffer } from "./fixtures"
import { displayNowForRun, runClockInterval, useExecutionClock } from "./time"
import { type ExecutionItem } from "./types"

const now = 1700000065123
const baseRun = makeExecution()

test("keeps fixture durations identical when server and hydration render later", () => {
  vi.useFakeTimers()
  try {
    vi.setSystemTime(now + 1000)
    const server = renderToString(createElement(AnchoredClock, { anchor: now }))
    vi.setSystemTime(now + 4000)
    const client = renderToString(
      createElement(AnchoredClock, { anchor: now + 3000 })
    )
    expect(server).toBe("<span>240000</span>")
    expect(client).toBe(server)
  } finally {
    vi.useRealTimers()
  }
})

function AnchoredClock({ anchor }: { anchor: number }) {
  const run = makeExecution({
    createdAt: anchor - 240_000,
    endedAt: undefined,
    status: "running",
  })
  const current = useExecutionClock([run], anchor)

  return createElement("span", null, current - run.createdAt)
}

test("uses a minute interval and buckets display time for settled runs", () => {
  expect(runClockInterval([baseRun], now)).toBe(60_000)
  expect(displayNowForRun(baseRun, now)).toBe(1700000040000)
})

test.each([
  {
    label: "running execution",
    run: makeExecution({ endedAt: undefined, status: "running" }),
  },
  {
    label: "pending approval",
    run: makeExecution({
      approval: makeApproval({
        decidedAt: undefined,
        state: "pending",
        expiresAt: now + 877,
      }),
    }),
  },
  {
    label: "waiting execution",
    run: makeExecution({
      waiter: {
        expiresAt: 1700001800000,
        id: "waiter-1" as NonNullable<ExecutionItem["waiter"]>["id"],
        state: "waiting",
      },
    }),
  },
  {
    label: "pending offer",
    run: makeExecution({ offer: makeOffer({ expiresAt: now + 877 }) }),
  },
])("uses a second interval for a $label", ({ run }) => {
  expect(runClockInterval([run], now)).toBe(1000)
})
