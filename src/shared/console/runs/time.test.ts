import { expect, test } from "vitest"
import { makeApproval, makeExecution, makeOffer } from "./fixtures"
import { displayNowForRun, runClockInterval } from "./time"
import { type ExecutionItem } from "./types"

const now = 1700000065123
const baseRun = makeExecution()

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
