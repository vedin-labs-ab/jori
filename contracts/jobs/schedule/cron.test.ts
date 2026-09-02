import { describe, expect, test } from "vitest"
import { getNextCronRunAt, validateCronExpression } from "./cron"

describe("cron scheduling", () => {
  test("rejects impossible day-of-month and month combinations", () => {
    expect(() => validateCronExpression("0 0 30 2 *")).toThrow(
      "This day of month never occurs in the selected months."
    )
    expect(() =>
      getNextCronRunAt("0 0 31 4,6,9,11 *", Date.UTC(2026, 0, 1))
    ).toThrow("This day of month never occurs in the selected months.")
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

describe("cron scheduling in timezones", () => {
  test("keeps wall-clock time across daylight-saving changes", () => {
    const nextRunAt = getNextCronRunAt(
      "0 8 * * *",
      Date.parse("2026-03-28T07:01:00.000Z"),
      "Europe/Stockholm"
    )

    expect(new Date(nextRunAt).toISOString()).toBe("2026-03-29T06:00:00.000Z")
  })

  test("skips a local time that does not exist", () => {
    const nextRunAt = getNextCronRunAt(
      "30 2 * * *",
      Date.parse("2026-03-28T23:00:00.000Z"),
      "Europe/Stockholm"
    )

    expect(new Date(nextRunAt).toISOString()).toBe("2026-03-30T00:30:00.000Z")
  })

  test("runs a repeated local time once", () => {
    const first = getNextCronRunAt(
      "30 2 * * *",
      Date.parse("2026-10-24T23:00:00.000Z"),
      "Europe/Stockholm"
    )
    const afterFirst = getNextCronRunAt(
      "30 2 * * *",
      Date.parse("2026-10-25T00:31:00.000Z"),
      "Europe/Stockholm"
    )

    expect(new Date(first).toISOString()).toBe("2026-10-25T00:30:00.000Z")
    expect(new Date(afterFirst).toISOString()).toBe("2026-10-26T01:30:00.000Z")
  })

  test("advances to tomorrow after today's local time has passed", () => {
    const nextRunAt = getNextCronRunAt(
      "15 7 * * *",
      Date.parse("2026-07-12T16:52:00.000Z"),
      "Europe/Stockholm"
    )

    expect(new Date(nextRunAt).toISOString()).toBe("2026-07-13T05:15:00.000Z")
  })
})
