import { describe, expect, test } from "vitest"
import { getNextCronRunAt, validateCronExpression } from "./cron"

describe("cron scheduling", () => {
  test("rejects impossible day-of-month and month combinations", () => {
    expect(() => validateCronExpression("0 0 30 2 *")).toThrow(
      "Cron day-of-month never occurs in the selected month(s)"
    )
    expect(() =>
      getNextCronRunAt("0 0 31 4,6,9,11 *", Date.UTC(2026, 0, 1))
    ).toThrow("Cron day-of-month never occurs in the selected month(s)")
  })

  test("preserves cron day-of-month and day-of-week OR semantics", () => {
    const nextRunAt = getNextCronRunAt("0 0 31 4 1", Date.UTC(2026, 0, 1))

    expect(new Date(nextRunAt).toISOString()).toBe("2026-04-06T00:00:00.000Z")
  })

  test("supports leap-day schedules", () => {
    const nextRunAt = getNextCronRunAt("0 0 29 2 *", Date.UTC(2026, 0, 1))

    expect(new Date(nextRunAt).toISOString()).toBe("2028-02-29T00:00:00.000Z")
  })

  test("finds sparse valid schedules without minute-by-minute scanning", () => {
    const nextRunAt = getNextCronRunAt("0 0 1 1 *", Date.UTC(2026, 0, 1))

    expect(new Date(nextRunAt).toISOString()).toBe("2027-01-01T00:00:00.000Z")
  })

  test("returns the next future matching minute", () => {
    const nextRunAt = getNextCronRunAt("*/15 * * * *", Date.UTC(2026, 0, 1))

    expect(new Date(nextRunAt).toISOString()).toBe("2026-01-01T00:15:00.000Z")
  })
})
