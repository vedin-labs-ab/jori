import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { JobContent } from "@/shared/console/jobs/list/content"
import { type Job, jobFilterOptions } from "@/shared/console/jobs/types"
import {
  ConsoleFilterGroup,
  ConsoleFilterToggle,
  ConsoleHeaderActions,
  ConsoleHeaderButton,
  ConsolePageLayout,
  ConsoleSearch,
} from "@/shared/console/layout"
import { audienceFilterOptions } from "@/shared/console/list/audience"
import { ConsoleListPager } from "@/shared/console/list/pager"
import { useClientPagination } from "@/shared/console/list/pagination"
import { useNow } from "@/shared/console/time"
import {
  filterJobs,
  hasJobFilters,
  type JobFilters,
  jobMoveSubject,
} from "../derive/jobs"
import { DemoMoveDialog } from "../dialogs/move"
import { useJobEditor } from "../editor"
import { useDemoWorkspace } from "../workspace"

const itemLabel = { singular: "job", plural: "jobs" }
const initialFilters: JobFilters = {
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

  return (
    <ConsolePageLayout>
      <JobsToolbar
        filters={filters}
        onChange={(patch) => {
          setFilters((current) => ({ ...current, ...patch }))
          pagination.reset()
        }}
        onCreate={create}
      />
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
        onOpenChange={(open) => {
          if (!open) {
            setMoving(undefined)
          }
        }}
        subject={moving === undefined ? undefined : jobMoveSubject(moving)}
      />
    </ConsolePageLayout>
  )
}

/** The header's search and New job, and the filter row under it. */
function JobsToolbar({
  filters,
  onChange,
  onCreate,
}: {
  filters: JobFilters
  onChange: (patch: Partial<JobFilters>) => void
  onCreate: () => void
}) {
  return (
    <>
      <ConsoleHeaderActions>
        <ConsoleSearch
          label="Search jobs"
          onValueChange={(query) => onChange({ query })}
          value={filters.query}
        />
        <ConsoleHeaderButton
          icon={<Plus />}
          label="New job"
          onClick={onCreate}
          type="button"
        />
      </ConsoleHeaderActions>
      <ConsoleFilterGroup>
        <ConsoleFilterToggle
          label="Status"
          onValueChange={(status) => onChange({ status })}
          options={jobFilterOptions}
          value={filters.status}
        />
        <ConsoleFilterToggle
          label="Sharing"
          onValueChange={(audience) => onChange({ audience })}
          options={audienceFilterOptions}
          value={filters.audience}
        />
      </ConsoleFilterGroup>
    </>
  )
}
