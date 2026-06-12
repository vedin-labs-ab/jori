import { describe, expect, test } from "vitest"
import {
  buildRecurringCron,
  classifyCron,
  composeCron,
  describeCron,
  getCrontabGuruUrl,
} from "./cron"

describe("automation cron form parts", () => {
  test("classifies the cron shapes the builder produces", () => {
    expect(classifyCron("0 9 * * *")).toMatchObject({
      repeat: "daily",
      time: "09:00",
    })
    expect(classifyCron("30 17 * * 1-5")).toMatchObject({
      repeat: "weekdays",
      time: "17:30",
    })
    expect(classifyCron("0 9 * * 7")).toMatchObject({
      repeat: "weekly",
      time: "09:00",
      weekday: "0",
    })
    expect(classifyCron("15 6 28 * *")).toMatchObject({
      monthDay: "28",
      repeat: "monthly",
      time: "06:15",
    })
  })

  test("falls back to custom for expressions the builder cannot represent", () => {
    for (const cron of ["*/5 * * * *", "0 9 * 6 1", "0 9 1 * 1", "0 9 * *"]) {
      expect(classifyCron(cron)).toMatchObject({ cron, repeat: "custom" })
    }
  })

  test("round-trips structured parts through compose and classify", () => {
    const parts = classifyCron("45 23 * * 6")
    expect(composeCron(parts)).toBe("45 23 * * 6")
    expect(classifyCron(composeCron(parts))).toEqual(parts)
  })

  test("builds and validates the composed expression", () => {
    expect(
      buildRecurringCron({ ...classifyCron("0 9 * * *"), time: "08:05" })
    ).toEqual({ cron: "5 8 * * *" })
    expect(
      buildRecurringCron({ ...classifyCron("0 9 * * *"), time: "" })
    ).toEqual({ error: "Time is required." })
    expect(buildRecurringCron(classifyCron("0 9 30 2 *"))).toEqual({
      error: "This day of month never occurs in the selected months.",
    })
  })

  test("describes builder shapes and leaves custom expressions raw", () => {
    expect(describeCron("0 9 * * *")).toBe("Daily at 09:00 UTC")
    expect(describeCron("30 17 * * 1-5")).toBe("Weekdays at 17:30 UTC")
    expect(describeCron("0 9 * * 1")).toBe("Mondays at 09:00 UTC")
    expect(describeCron("15 6 3 * *")).toBe("Monthly on the 3rd at 06:15 UTC")
    expect(describeCron("*/5 * * * *")).toBe(null)
  })

  test("builds Crontab.guru links from the current expression", () => {
    expect(getCrontabGuruUrl("5 4 * * 3")).toBe(
      "https://crontab.guru/#5_4_*_*_3"
    )
    expect(getCrontabGuruUrl("  */5   * * * *  ")).toBe(
      "https://crontab.guru/#*/5_*_*_*_*"
    )
    expect(getCrontabGuruUrl("")).toBe("https://crontab.guru/")
  })
})
