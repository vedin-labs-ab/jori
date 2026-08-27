import { type ScopeFilter } from "../list/scope"

// Materials (tables, stores) archive before they delete, so their list pages
// share one status facet: active by default, with archived reachable.

export const archiveFilterOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Archived", value: "archived" },
] as const

export type ArchiveFilter = (typeof archiveFilterOptions)[number]["value"]

export function shouldIncludeArchived(filter: ArchiveFilter) {
  return filter !== "active"
}

export function matchesArchiveFilter(
  archivedAt: number | undefined,
  filter: ArchiveFilter
) {
  if (filter === "all") {
    return true
  }

  return filter === "archived"
    ? archivedAt !== undefined
    : archivedAt === undefined
}

export function hasMaterialFilters(
  query: string,
  filter: ArchiveFilter,
  scope: ScopeFilter
) {
  return query.trim() !== "" || filter !== "active" || scope !== "all"
}
