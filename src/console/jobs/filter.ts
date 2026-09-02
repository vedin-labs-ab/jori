import { type Job, type JobFilter } from "./types"

export function hasJobFilters(query: string, filter: JobFilter) {
  return query.trim() !== "" || filter !== "active"
}

export function filterJobsByView(jobs: Job[], filter: JobFilter) {
  if (filter === "all") {
    return jobs
  }

  return jobs.filter((job) => job.status === filter)
}
