import { describe, expect, test } from "vitest"
import { durationMilliseconds, durationUnits, isDurationUnit } from "./duration"

describe("runtime durations", () => {
  test.each([
    ["seconds", 1000],
    ["minutes", 60_000],
    ["hours", 3_600_000],
    ["days", 86_400_000],
  ] as const)("converts %s to milliseconds", (unit, expected) => {
    expect(durationMilliseconds({ unit, value: 1 })).toBe(expected)
  })

  test("recognizes only supported units", () => {
    for (const unit of durationUnits) {
      expect(isDurationUnit(unit)).toBe(true)
    }

    expect(isDurationUnit("weeks")).toBe(false)
  })
})
