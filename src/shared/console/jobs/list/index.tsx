import { Plus, Workflow } from "lucide-react"
import { type ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import { type ResourceDragItem } from "@/shared/console/folders/drag/plan"
import {
  accessColumns,
  ownerColumn,
  timeColumn,
} from "@/shared/console/materials/cells/columns"
import {
  type MaterialColumn,
  MaterialList,
} from "@/shared/console/materials/list"
import { materialOwner } from "@/shared/console/materials/owners"
import { type Job } from "../types"
import { JobRowMenu } from "./actions"
import { JobNameCell, JobTriggerCell } from "./cells"
import { jobNoun } from "./config"
import { JobToolSummary } from "./tools"
import { nextRunAt } from "./trigger"

/** What a job list's rows can ask of the page, and which row is busy
 *  with a pause, resume, or delete still in flight. */
export type JobListActions = {
  controllingJobId: string | undefined
  deletingJobId: string | undefined
  onDelete: (job: Job) => void
  onEdit: (job: Job) => void
  onMoveToFolder: (job: Job) => void
  onPausedChange: (job: Job, paused: boolean) => void
}

const identify = (job: Job) => job.id

const drag = (job: Job): ResourceDragItem => ({
  type: "job",
  id: job.id,
  name: job.name,
  folderId: job.folderId,
})

/** After the name: how the job starts, what it may touch, where it is
 *  filed and whose it is, then when it last ran and when it runs next. */
const columns: MaterialColumn<Job>[] = [
  { cell: (job) => <JobTriggerCell job={job} />, label: "Trigger", tier: "md" },
  { cell: (job) => <JobToolSummary job={job} />, label: "Tools", tier: "5xl" },
  ...accessColumns<Job>(),
  ownerColumn(materialOwner, "4xl"),
  timeColumn("Last run", "fired", (job) => job.firedAt, "5xl"),
  timeColumn("Next run", "next", nextRunAt, "4xl"),
]

export function JobList({
  controllingJobId,
  deletingJobId,
  jobs,
  onCreate,
  onDelete,
  onEdit,
  onMoveToFolder,
  onPausedChange,
  ...props
}: Omit<ComponentProps<typeof MaterialList<Job>>, "kind" | "rows"> &
  JobListActions & {
    jobs: Job[]
    onCreate: () => void
  }) {
  return (
    <MaterialList
      {...props}
      kind={{
        action: (
          <Button onClick={onCreate} type="button">
            <Plus />
            New job
          </Button>
        ),
        columns,
        description:
          "Create a job for recurring, one-time, or event-triggered work.",
        drag,
        icon: Workflow,
        identify,
        menu: (job) => (
          <JobRowMenu
            isControlling={controllingJobId === job.id}
            isDeleting={deletingJobId === job.id}
            job={job}
            onDelete={onDelete}
            onEdit={onEdit}
            onMoveToFolder={onMoveToFolder}
            onPausedChange={onPausedChange}
          />
        ),
        nameCell: (job) => <JobNameCell job={job} />,
        noun: jobNoun,
      }}
      rows={jobs}
    />
  )
}
