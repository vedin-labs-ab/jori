import { useMutation, useQuery } from "convex/react"
import { useDeferredValue, useState } from "react"
import { countNoun } from "@/shared/console/count"
import {
  jobBulkRemoval,
  jobListConfig,
  jobNoun,
} from "@/shared/console/jobs/list/config"
import { type Job, type JobFilter } from "@/shared/console/jobs/types"
import {
  type AudienceFilter,
  matchesAudienceFilter,
} from "@/shared/console/list/audience"
import { useBulkRunner } from "@/shared/console/list/bulk"
import { useListState } from "@/shared/console/list/controls"
import { useResettingSetter } from "@/shared/console/list/pagination"
import { type RowSelection } from "@/shared/console/list/selection"
import { api } from "../../../convex/_generated/api"
import { useFolderNames } from "../shared/materials/names"
import { hasJobFilters } from "./filter"

export const defaultJobFilter: JobFilter = "active"

/** One bag of page state for the Jobs list: the panel's status and
 *  visibility facets, the search, the header controls, the client-side
 *  page, and the row selection. */
export function useJobListPage(organizationId: string) {
  const [filter, setFilter] = useState<JobFilter>(defaultJobFilter)
  const [audience, setAudience] = useState<AudienceFilter>("all")
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const list = useQuery(api.jobs.console.list, {
    organizationId,
    query: deferredQuery,
    statusFilter: filter,
  })
  const folders = useFolderNames(organizationId)
  const rows =
    list?.status === "ready"
      ? list.jobs.filter((job) => matchesAudienceFilter(job.audience, audience))
      : []
  const listing = useListState({
    config: jobListConfig(folders, rows),
    hasFilters: hasJobFilters(deferredQuery, filter) || audience !== "all",
    identify: (job: Job) => job.id,
    isReady: list?.status === "ready",
    noun: jobNoun,
    rows,
  })

  return {
    audience,
    ...listing,
    filter,
    folders,
    list,
    query,
    setAudience: useResettingSetter(setAudience, listing.pagination.reset),
    setFilter: useResettingSetter(setFilter, listing.pagination.reset),
    setQuery: useResettingSetter(setQuery, listing.pagination.reset),
  }
}

/** The selection bar's delete: one removal per selected job, through the
 *  same mutation a row's Delete uses. */
export function useJobBulk(
  organizationId: string,
  selection: RowSelection<Job>
) {
  const runner = useBulkRunner()
  const remove = useMutation(api.jobs.console.remove)

  return {
    isBusy: runner.isBusy,
    removal: jobBulkRemoval,
    removeSelected: () => {
      const jobs = selection.selected

      void runner.run(
        jobs,
        (job) => remove({ organizationId, jobId: job.id }),
        {
          noun: jobNoun.plural,
          success: `Deleted ${countNoun(jobs.length, jobNoun)}.`,
          verb: "delete",
        }
      )
    },
  }
}
