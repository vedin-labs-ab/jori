import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ConsoleScrollableList } from "../../shared/layout"
import { ConsoleListLoading } from "../../shared/list/loading"
import { type JobEditor } from "../editor"
import { type JobList } from "../types"
import { EmptyJobs } from "./empty"
import { JobRow } from "./row"

// Auto-fill tracks add columns as the viewport grows instead of stretching
// cards, keeping the unbounded console frame usable at any width.
const jobGrid = "grid-cols-[repeat(auto-fill,minmax(min(28rem,100%),1fr))] pb-2"

export function JobContent({
  editor,
  hasFilters,
  now,
  jobList,
  onCreate,
  onMoveToFolder,
  visibleJobs,
}: {
  editor: JobEditor
  hasFilters: boolean
  now: number
  jobList: JobList | undefined
  onCreate: () => void
  onMoveToFolder: (job: JobList["jobs"][number]) => void
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
          isControlling={editor.controllingJobId === job.id}
          isDeleting={editor.deletingJobId === job.id}
          key={job.id}
          now={now}
          onDelete={editor.deleteJob}
          onEdit={editor.openEditForm}
          onMoveToFolder={onMoveToFolder}
          onPausedChange={editor.setJobPaused}
          job={job}
        />
      ))}
    </ConsoleScrollableList>
  )
}
