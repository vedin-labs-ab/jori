import { type ArtifactSummary } from "./types"

export const artifactFilterOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Archived", value: "archived" },
] as const

export type ArtifactFilter = (typeof artifactFilterOptions)[number]["value"]

export function shouldIncludeArchivedArtifacts(filter: ArtifactFilter) {
  return filter !== "active"
}

export function hasArtifactFilters(query: string, filter: ArtifactFilter) {
  return query.trim() !== "" || filter !== "active"
}

export function filterArtifactsByView(
  artifacts: ArtifactSummary[],
  filter: ArtifactFilter
) {
  if (filter === "all") {
    return artifacts
  }

  return artifacts.filter((artifact) =>
    filter === "archived"
      ? artifact.archivedAt !== undefined
      : artifact.archivedAt === undefined
  )
}
