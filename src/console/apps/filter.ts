import { type AppSummary } from "./types"

export const appFilterOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Archived", value: "archived" },
] as const

export type AppFilter = (typeof appFilterOptions)[number]["value"]

export function shouldIncludeArchivedApps(filter: AppFilter) {
  return filter !== "active"
}

export function hasAppFilters(query: string, filter: AppFilter) {
  return query.trim() !== "" || filter !== "active"
}

export function filterAppsByView(apps: AppSummary[], filter: AppFilter) {
  if (filter === "all") {
    return apps
  }

  return apps.filter((app) =>
    filter === "archived"
      ? app.archivedAt !== undefined
      : app.archivedAt === undefined
  )
}
