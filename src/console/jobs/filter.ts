import { type JobFilter } from "@/shared/console/jobs/types"

export function hasJobFilters(query: string, filter: JobFilter) {
  return query.trim() !== "" || filter !== "active"
}
