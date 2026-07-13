import { type Workstreams } from "./types"

export const workstreamFilterOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Archived", value: "closed" },
  { label: "Not workstreams", value: "rejected" },
] as const

export type WorkstreamFilter = (typeof workstreamFilterOptions)[number]["value"]

export function hasWorkstreamFilters(filter: WorkstreamFilter) {
  return filter !== "active"
}

export function filterWorkstreamsByView(
  workstreams: Workstreams,
  filter: WorkstreamFilter
) {
  if (filter === "all") {
    return workstreams
  }

  if (filter === "active") {
    return workstreams.filter(
      (workstream) =>
        workstream.status === "confirmed" || workstream.status === "proposed"
    )
  }

  return workstreams.filter((workstream) => workstream.status === filter)
}
