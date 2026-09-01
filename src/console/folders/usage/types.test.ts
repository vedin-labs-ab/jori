import { expect, test } from "vitest"
import {
  type UsageOverview,
  usageCostPerRun,
  usageDelta,
  usagePercent,
  usageSlice,
} from "./types"

function overview(overrides: Partial<UsageOverview> = {}) {
  return {
    automations: [
      { id: "automations:1", label: "Morning digest", micros: 900 },
      { label: "One-shot reminder", micros: 20 },
    ],
    folders: [{ folderId: "folders:1", name: "Sales", micros: 700 }],
    ...overrides,
  } as UsageOverview
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

test("a chosen automation asks the series query for that automation", () => {
  expect(usageSlice("automations:1", overview())).toEqual({
    automationId: "automations:1",
  })
})

test("a chosen folder asks for that folder's subtree", () => {
  expect(usageSlice("folders:1", overview())).toEqual({
    folderId: "folders:1",
  })
})

test("a choice the window no longer ranks falls back to everything", () => {
  expect(usageSlice("everything", overview())).toBeUndefined()
  expect(usageSlice("folders:gone", overview())).toBeUndefined()
  // A deleted automation keeps its row but loses its id, so it was never
  // on offer and cannot be selected back into the charts.
  expect(usageSlice("One-shot reminder", overview())).toBeUndefined()
})
