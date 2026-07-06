import { expect, test } from "vitest"
import { nextDebounceSchedule } from "./debounce"

test("debounces without passing the hard ceiling", () => {
  const now = 1_000
  const debounceMs = 500
  const maxDelayMs = 5_000

  expect(
    nextDebounceSchedule({ now, ceilingAt: undefined, debounceMs, maxDelayMs })
  ).toEqual({
    runAt: now + debounceMs,
    ceilingAt: now + maxDelayMs,
  })
  expect(
    nextDebounceSchedule({ now, ceilingAt: now + 200, debounceMs, maxDelayMs })
  ).toEqual({
    runAt: now + 200,
    ceilingAt: now + 200,
  })
})
