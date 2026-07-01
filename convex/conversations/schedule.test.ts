import { expect, test } from "vitest"
import { summaryDebounceMs, summaryMaxDelayMs } from "./limits"
import { nextSummarySchedule } from "./schedule"

test("debounces summaries without passing the hard ceiling", () => {
  const now = 1_000

  expect(nextSummarySchedule(now, undefined)).toEqual({
    runAt: now + summaryDebounceMs,
    summarizeAt: now + summaryMaxDelayMs,
  })
  expect(nextSummarySchedule(now, now + 2_000)).toEqual({
    runAt: now + 2_000,
    summarizeAt: now + 2_000,
  })
})
