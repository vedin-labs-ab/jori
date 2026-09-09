import { expect, test } from "vitest"
import { hasJobFilters } from "./filter"

test("the default active view has no filters unless there is a search", () => {
  expect(hasJobFilters("", "active")).toBe(false)
  expect(hasJobFilters("   ", "active")).toBe(false)
  expect(hasJobFilters("digest", "active")).toBe(true)
})

test.each(["all", "paused"] as const)("%s is a filtered view", (filter) => {
  expect(hasJobFilters("", filter)).toBe(true)
})
