import { useQuery } from "convex/react"
import { useDeferredValue, useState } from "react"
import { moveTarget } from "@/shared/console/folders/types"
import { JobContent } from "@/shared/console/jobs/list/content"
import { JobFilters } from "@/shared/console/jobs/list/filters"
import {
  type Job,
  type JobFilter,
  type JobList,
} from "@/shared/console/jobs/types"
import { ConsolePageLayout } from "@/shared/console/layout"
import {
  type AudienceFilter,
  matchesAudienceFilter,
} from "@/shared/console/list/audience"
import { ConsoleListPager } from "@/shared/console/list/pager"
import {
  useClientPagination,
  useResettingSetter,
} from "@/shared/console/list/pagination"
import { useNow } from "@/shared/console/time"
import { api } from "../../../convex/_generated/api"
import { MoveResourceDialog } from "../folders/move"
import { ConsolePage } from "../page"
import { useJobEditorHost } from "./editor/host"
import { filterJobsByView, hasJobFilters } from "./filter"

export function Jobs() {
  return (
    <ConsolePage>
      {(organizationId) => <JobListView organizationId={organizationId} />}
    </ConsolePage>
  )
}

function JobListView({ organizationId }: { organizationId: string }) {
  const filters = useJobFilters()
  const deferredQuery = useDeferredValue(filters.query)
  const jobList = useQuery(api.jobs.console.list, {
    organizationId,
    query: deferredQuery,
    statusFilter: filters.filter,
  })
  const { dialog, editor, preloadDialog } = useJobEditorHost(organizationId)
  const [movingJob, setMovingJob] = useState<Job>()
  const now = useNow(30_000)
  const { hasFilters, pagination } = useJobPagination({
    jobList,
    filter: filters.filter,
    query: deferredQuery,
    audience: filters.audience,
  })
  const setters = useResettingFilterSetters(filters, pagination.reset)

  return (
    <JobFilters
      audience={filters.audience}
      defaultStatus={defaultJobFilter}
      onAudienceChange={setters.setAudience}
      onCreate={editor.openCreateForm}
      onCreateIntent={preloadDialog}
      onQueryChange={setters.setQuery}
      onStatusChange={setters.setFilter}
      query={filters.query}
      status={filters.filter}
    >
      <ConsolePageLayout>
        <JobContent
          controllingJobId={editor.controllingJobId}
          deletingJobId={editor.deletingJobId}
          hasFilters={hasFilters}
          now={now}
          jobList={jobList}
          onCreate={() => {
            void preloadDialog()
            editor.openCreateForm()
          }}
          onDelete={editor.deleteJob}
          onEdit={editor.openEditForm}
          onMoveToFolder={setMovingJob}
          onPausedChange={editor.setJobPaused}
          visibleJobs={pagination.visibleRows}
        />
        {jobList?.status !== "unauthorized" ? (
          <ConsoleListPager pagination={pagination} />
        ) : null}
        {dialog}
        <MoveResourceDialog
          onClose={() => setMovingJob(undefined)}
          organizationId={organizationId}
          resource={movingResource(movingJob)}
        />
      </ConsolePageLayout>
    </JobFilters>
  )
}

function movingResource(job: Job | undefined) {
  return job === undefined ? undefined : moveTarget("job", job.id, job)
}

const defaultJobFilter: JobFilter = "active"

function useJobFilters() {
  const [filter, setFilter] = useState<JobFilter>(defaultJobFilter)
  const [audience, setAudience] = useState<AudienceFilter>("all")
  const [query, setQuery] = useState("")

  return { filter, query, audience, setFilter, setQuery, setAudience }
}

/** Every filter change resets the pager back to the first page. */
function useResettingFilterSetters(
  filters: ReturnType<typeof useJobFilters>,
  reset: () => void
) {
  return {
    setFilter: useResettingSetter(filters.setFilter, reset),
    setQuery: useResettingSetter(filters.setQuery, reset),
    setAudience: useResettingSetter(filters.setAudience, reset),
  }
}

function useJobPagination({
  jobList,
  filter,
  query,
  audience,
}: {
  jobList: JobList | undefined
  filter: JobFilter
  query: string
  audience: AudienceFilter
}) {
  const hasFilters = hasJobFilters(query, filter) || audience !== "all"
  const jobs =
    jobList?.status === "ready"
      ? filterJobsByView(jobList.jobs, filter).filter((job) =>
          matchesAudienceFilter(job.audience, audience)
        )
      : []
  const pagination = useClientPagination({
    hasFilters,
    isReady: jobList?.status === "ready",
    itemLabel: { singular: "job", plural: "jobs" },
    items: jobs,
  })

  return { hasFilters, pagination }
}
