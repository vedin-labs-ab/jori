import { expect, test } from "vitest"
import { canRetry, retryDelay, retryWindowMs } from "./policy"

test("retries close before Bird's idempotency key expires", () => {
  expect(canRetry(0, 1, retryWindowMs - 1)).toBe(false)
  expect(canRetry(0, 12, 100)).toBe(false)
  expect(canRetry(0, 1, 100)).toBe(true)
  expect(retryDelay(1, 120_000)).toBe(120_000)
  expect(retryDelay(10)).toBe(600_000)
})
