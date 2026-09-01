import { expect, test } from "vitest"
import { type UsageOverview, usageSlice, usageSpendShare } from "./types"

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
  expect(usageSpendShare(1800, 10_000)).toBe("18% of spend")
  expect(usageSpendShare(10_000, 10_000)).toBe("100% of spend")
})

test("a share too small to round to a percent says so instead of vanishing", () => {
  expect(usageSpendShare(4, 10_000)).toBe("<1% of spend")
  expect(usageSpendShare(60, 10_000)).toBe("1% of spend")
})

test("nothing spent leaves nothing to take a share of", () => {
  expect(usageSpendShare(0, 10_000)).toBeUndefined()
  expect(usageSpendShare(500, 0)).toBeUndefined()
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
  // on offer and cannot be selected back into the chart.
  expect(usageSlice("One-shot reminder", overview())).toBeUndefined()
})
