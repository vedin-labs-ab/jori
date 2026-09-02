import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ConsoleScrollableList } from "@/shared/console/layout"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { type Job, type JobList } from "../types"
import { EmptyJobs } from "./empty"
import { JobRow } from "./row"

// Auto-fill tracks add columns as the viewport grows instead of stretching
// cards, keeping the unbounded console frame usable at any width.
const jobGrid = "grid-cols-[repeat(auto-fill,minmax(min(28rem,100%),1fr))] pb-2"

export function JobContent({
  controllingJobId,
  deletingJobId,
  hasFilters,
  now,
  jobList,
  onCreate,
  onDelete,
  onEdit,
  onMoveToFolder,
  onPausedChange,
  visibleJobs,
}: {
  /** The job whose pause or resume is still in flight, if any. */
  controllingJobId: string | undefined
  /** The job whose deletion is still in flight, if any. */
  deletingJobId: string | undefined
  hasFilters: boolean
  now: number
  jobList: JobList | undefined
  onCreate: () => void
  onDelete: (job: Job) => void
  onEdit: (job: Job) => void
  onMoveToFolder: (job: Job) => void
  onPausedChange: (job: Job, paused: boolean) => void
  visibleJobs: JobList["jobs"]
}) {
  if (jobList === undefined) {
    return <ConsoleListLoading />
  }

  if (jobList.status === "unauthorized") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Job access unavailable</AlertTitle>
        <AlertDescription>{jobList.message}</AlertDescription>
      </Alert>
    )
  }

  if (visibleJobs.length === 0) {
    return (
      <ConsoleScrollableList className={jobGrid}>
        <li className="col-span-full">
          <EmptyJobs hasFilters={hasFilters} onCreate={onCreate} />
        </li>
      </ConsoleScrollableList>
    )
  }

  return (
    <ConsoleScrollableList className="pb-2 lg:grid-cols-2">
      {visibleJobs.map((job) => (
        <JobRow
          isControlling={controllingJobId === job.id}
          isDeleting={deletingJobId === job.id}
          key={job.id}
          now={now}
          onDelete={onDelete}
          onEdit={onEdit}
          onMoveToFolder={onMoveToFolder}
          onPausedChange={onPausedChange}
          job={job}
        />
      ))}
    </ConsoleScrollableList>
  )
}
