import { useMemo, useState } from "react"
import { JobContent } from "@/shared/console/jobs/list/content"
import { JobFilters } from "@/shared/console/jobs/list/filters"
import { type Job } from "@/shared/console/jobs/types"
import { ConsolePageLayout } from "@/shared/console/layout"
import { ConsoleListPager } from "@/shared/console/list/pager"
import { useClientPagination } from "@/shared/console/list/pagination"
import { closeOnDismiss } from "@/shared/console/retain"
import { useNow } from "@/shared/console/time"
import {
  filterJobs,
  hasJobFilters,
  type JobFilters as JobFilterValues,
  jobMoveSubject,
} from "../derive/jobs"
import { DemoMoveDialog } from "../dialogs/move"
import { useJobEditor } from "../editor"
import { useDemoWorkspace } from "../workspace"

const itemLabel = { singular: "job", plural: "jobs" }
const initialFilters: JobFilterValues = {
  audience: "all",
  query: "",
  status: "all",
}

/** The Jobs page over the workspace: the filters, the cards, the pager,
 *  and the editor every card's menu opens. */
export function JobsPage() {
  const { actions, state } = useDemoWorkspace()
  const editor = useJobEditor()
  const [filters, setFilters] = useState(initialFilters)
  const [moving, setMoving] = useState<Job>()
  const now = useNow(30_000)
  const jobs = useMemo(
    () => filterJobs(state.jobs, filters),
    [state.jobs, filters]
  )
  const jobList = useMemo(
    () => ({ status: "ready" as const, jobs: state.jobs }),
    [state.jobs]
  )
  const hasFilters = hasJobFilters(filters)
  const pagination = useClientPagination({
    hasFilters,
    isReady: true,
    itemLabel,
    items: jobs,
  })
  const create = () => editor.openCreateForm()
  const update = (patch: Partial<JobFilterValues>) => {
    setFilters((current) => ({ ...current, ...patch }))
    pagination.reset()
  }

  return (
    <JobFilters
      audience={filters.audience}
      defaultStatus={initialFilters.status}
      onAudienceChange={(audience) => update({ audience })}
      onCreate={create}
      onQueryChange={(query) => update({ query })}
      onStatusChange={(status) => update({ status })}
      query={filters.query}
      status={filters.status}
    >
      <ConsolePageLayout>
        <JobContent
          controllingJobId={undefined}
          deletingJobId={undefined}
          hasFilters={hasFilters}
          jobList={jobList}
          now={now}
          onCreate={create}
          onDelete={actions.deleteJob}
          onEdit={editor.openEditForm}
          onMoveToFolder={setMoving}
          onPausedChange={actions.setJobPaused}
          visibleJobs={pagination.visibleRows}
        />
        <ConsoleListPager pagination={pagination} />
        <DemoMoveDialog
          onOpenChange={closeOnDismiss(() => setMoving(undefined))}
          subject={moving === undefined ? undefined : jobMoveSubject(moving)}
        />
      </ConsolePageLayout>
    </JobFilters>
  )
}
