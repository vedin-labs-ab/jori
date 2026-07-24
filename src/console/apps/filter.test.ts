import { expect, test } from "vitest"
import {
  filterAppsByView,
  hasAppFilters,
  shouldIncludeArchivedApps,
} from "./filter"
import { type AppSummary } from "./types"

test("defaults to active apps without treating the view as a filter", () => {
  expect(hasAppFilters("", "active")).toBe(false)
  expect(shouldIncludeArchivedApps("active")).toBe(false)
  expect(filterAppsByView(apps(), "active").map((item) => item.title)).toEqual([
    "Active",
  ])
})

test("shows active and archived apps in the all view", () => {
  expect(hasAppFilters("", "all")).toBe(true)
  expect(shouldIncludeArchivedApps("all")).toBe(true)
  expect(filterAppsByView(apps(), "all").map((item) => item.title)).toEqual([
    "Active",
    "Archived",
  ])
})

test("shows only archived apps in the archived view", () => {
  expect(hasAppFilters("", "archived")).toBe(true)
  expect(shouldIncludeArchivedApps("archived")).toBe(true)
  expect(
    filterAppsByView(apps(), "archived").map((item) => item.title)
  ).toEqual(["Archived"])
})

function apps(): AppSummary[] {
  return [app("Active", undefined), app("Archived", 1)]
}

function app(title: string, archivedAt: number | undefined) {
  return {
    archivedAt,
    title,
  } as AppSummary
}
