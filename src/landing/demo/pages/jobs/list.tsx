import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  type MoveResourceTarget,
  resourceSubject,
} from "@/shared/console/folders/types"
import { JobList } from "@/shared/console/jobs/list"
import {
  jobBulkRemoval,
  jobListConfig,
  jobNoun,
} from "@/shared/console/jobs/list/config"
import { JobFilters } from "@/shared/console/jobs/list/filters"
import { type Job } from "@/shared/console/jobs/types"
import { useListState } from "@/shared/console/list/controls"
import {
  ConsoleListFooter,
  ConsoleListLayout,
} from "@/shared/console/list/frame"
import { ConsoleListPager } from "@/shared/console/list/pager"
import { closeOnDismiss } from "@/shared/console/retain"
import { folderNames } from "../../derive/folders"
import {
  filterJobs,
  hasJobFilters,
  type JobFilters as JobFilterValues,
  jobMoveTarget,
} from "../../derive/jobs"
import { DemoMoveDialog } from "../../dialogs/move"
import { useJobEditor } from "../../editor"
import { useDemoWorkspace } from "../../workspace"

const initialFilters: JobFilterValues = {
  audience: "all",
  query: "",
  status: "all",
}

/** What the Jobs page keeps over the workspace: the panel's facets and
 *  the search, the header's sorts and facets, the pager, and a selection
 *  over the visible rows. */
function useJobsListing() {
  const { state } = useDemoWorkspace()
  const [filters, setFilters] = useState(initialFilters)
  const folders = useMemo(() => folderNames(state), [state])
  const jobs = useMemo(
    () => filterJobs(state.jobs, filters),
    [state.jobs, filters]
  )
  const listing = useListState({
    config: jobListConfig(folders, jobs),
    hasFilters: hasJobFilters(filters),
    identify: (job: Job) => job.id,
    isReady: true,
    noun: jobNoun,
    rows: jobs,
  })

  return {
    ...listing,
    filters,
    folders,
    update: (patch: Partial<JobFilterValues>) => {
      setFilters((current) => ({ ...current, ...patch }))
      listing.pagination.reset()
    },
  }
}

/** The Jobs page over the workspace: the filters, the table, the pager,
 *  and the editor every row's menu opens. */
export function JobsPage() {
  const { actions, state } = useDemoWorkspace()
  const editor = useJobEditor()
  const listing = useJobsListing()
  const [moving, setMoving] = useState<MoveResourceTarget[]>()
  const create = () => editor.openCreateForm()

  return (
    <JobFilters
      audience={listing.filters.audience}
      defaultStatus={initialFilters.status}
      onAudienceChange={(audience) => listing.update({ audience })}
      onCreate={create}
      onQueryChange={(query) => listing.update({ query })}
      onStatusChange={(status) => listing.update({ status })}
      query={listing.filters.query}
      status={listing.filters.status}
    >
      <ConsoleListLayout>
        <JobList
          config={jobListConfig(listing.folders, state.jobs)}
          controllingJobId={undefined}
          controls={listing.controls}
          deletingJobId={undefined}
          folders={listing.folders}
          hasFilters={listing.hasFilters}
          jobs={listing.pagination.visibleRows}
          onCreate={create}
          onDelete={actions.deleteJob}
          onEdit={editor.openEditForm}
          onMoveToFolder={(job) => setMoving([jobMoveTarget(job)])}
          onPausedChange={actions.setJobPaused}
          selection={listing.selection}
          selectionActions={{
            isBusy: false,
            noun: jobNoun,
            onMove: () =>
              setMoving(listing.selection.selected.map(jobMoveTarget)),
            onRemove: () => {
              for (const job of listing.selection.selected) {
                actions.deleteJob(job)
              }

              toast.success(`Deleted ${listing.selection.count} jobs.`)
            },
            removal: jobBulkRemoval,
          }}
          unauthorizedMessage={undefined}
        />
        <ConsoleListFooter>
          <ConsoleListPager pagination={listing.pagination} />
        </ConsoleListFooter>
        <DemoMoveDialog
          onOpenChange={closeOnDismiss(() => setMoving(undefined))}
          subject={
            moving === undefined || moving.length === 0
              ? undefined
              : resourceSubject(moving)
          }
        />
      </ConsoleListLayout>
    </JobFilters>
  )
}
