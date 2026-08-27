import { expect, test } from "vitest"
import {
  hasMaterialFilters,
  matchesArchiveFilter,
  shouldIncludeArchived,
} from "./archive"

test("active is the default view and not a filter", () => {
  expect(shouldIncludeArchived("active")).toBe(false)
  expect(hasMaterialFilters("", "active", "all")).toBe(false)
})

test("all and archived views include archived materials", () => {
  expect(shouldIncludeArchived("all")).toBe(true)
  expect(shouldIncludeArchived("archived")).toBe(true)
  expect(hasMaterialFilters("", "all", "all")).toBe(true)
})

test("matches materials against the archive facet", () => {
  expect(matchesArchiveFilter(undefined, "active")).toBe(true)
  expect(matchesArchiveFilter(1, "active")).toBe(false)
  expect(matchesArchiveFilter(1, "archived")).toBe(true)
  expect(matchesArchiveFilter(undefined, "archived")).toBe(false)
  expect(matchesArchiveFilter(1, "all")).toBe(true)
})

test("search text and scope count as filters", () => {
  expect(hasMaterialFilters("billing", "active", "all")).toBe(true)
  expect(hasMaterialFilters("", "active", "personal")).toBe(true)
})
