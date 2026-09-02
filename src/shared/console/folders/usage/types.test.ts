import { expect, test } from "vitest"
import {
  type UsageSegment,
  usageCostPerRun,
  usageDelta,
  usagePercent,
  usageSegmentColor,
} from "./types"

function segment(key: string): UsageSegment {
  return { key, label: key, micros: 0, ended: 0, failed: 0 }
}

test("a share reads as the whole percent it rounds to", () => {
  expect(usagePercent(1800, 10_000)).toBe("18%")
  expect(usagePercent(10_000, 10_000)).toBe("100%")
})

test("a share too small to round to a percent says so instead of vanishing", () => {
  expect(usagePercent(4, 10_000)).toBe("<1%")
  expect(usagePercent(60, 10_000)).toBe("1%")
})

test("nothing spent leaves nothing to take a share of", () => {
  expect(usagePercent(0, 10_000)).toBeUndefined()
  expect(usagePercent(500, 0)).toBeUndefined()
})

test("a delta is the percent moved against the window before", () => {
  expect(usageDelta(135, 100)).toEqual({ direction: "up", percent: 35 })
  expect(usageDelta(90, 100)).toEqual({ direction: "down", percent: 10 })
  expect(usageDelta(100, 100)).toEqual({ direction: "level", percent: 0 })
})

test("a move too small to round to a percent reads as level", () => {
  expect(usageDelta(1004, 1000)).toEqual({ direction: "level", percent: 0 })
})

test("an empty previous window is no delta rather than an infinite one", () => {
  expect(usageDelta(100, 0)).toBeUndefined()
})

test("cost per run averages over the runs that ended", () => {
  expect(usageCostPerRun(900, 3)).toBe(300)
  expect(usageCostPerRun(900, 0)).toBeUndefined()
})

test("a segment wears the colour of its rank, and the rest wears none", () => {
  expect(usageSegmentColor(segment("folders:1"), 0)).toBe("var(--chart-1)")
  expect(usageSegmentColor(segment("direct"), 7)).toBe("var(--chart-8)")
  expect(usageSegmentColor(segment("other"), 8)).toBe("var(--muted-foreground)")
})
