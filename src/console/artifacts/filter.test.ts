import { expect, test } from "vitest"
import {
  filterArtifactsByView,
  hasArtifactFilters,
  shouldIncludeArchivedArtifacts,
} from "./filter"
import { type ArtifactSummary } from "./types"

test("defaults to active artifacts without treating the view as a filter", () => {
  expect(hasArtifactFilters("", "active")).toBe(false)
  expect(shouldIncludeArchivedArtifacts("active")).toBe(false)
  expect(
    filterArtifactsByView(artifacts(), "active").map((item) => item.title)
  ).toEqual(["Active"])
})

test("shows active and archived artifacts in the all view", () => {
  expect(hasArtifactFilters("", "all")).toBe(true)
  expect(shouldIncludeArchivedArtifacts("all")).toBe(true)
  expect(
    filterArtifactsByView(artifacts(), "all").map((item) => item.title)
  ).toEqual(["Active", "Archived"])
})

test("shows only archived artifacts in the archived view", () => {
  expect(hasArtifactFilters("", "archived")).toBe(true)
  expect(shouldIncludeArchivedArtifacts("archived")).toBe(true)
  expect(
    filterArtifactsByView(artifacts(), "archived").map((item) => item.title)
  ).toEqual(["Archived"])
})

function artifacts(): ArtifactSummary[] {
  return [artifact("Active", undefined), artifact("Archived", 1)]
}

function artifact(title: string, archivedAt: number | undefined) {
  return {
    archivedAt,
    title,
  } as ArtifactSummary
}
