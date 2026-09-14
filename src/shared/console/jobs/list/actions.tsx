import {
  FolderInput,
  FolderMinus,
  Loader2,
  Pause,
  Pencil,
  Play,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { materialOwner } from "@/shared/console/materials/owners"
import {
  menuWidth,
  RowMenuTrigger,
  TitleMenuContent,
} from "@/shared/console/menu"
import { MenuProvenance } from "@/shared/console/menu/provenance"
import { type Job, jobControlAction } from "../types"
import { DeleteJobDialog } from "./delete"
import { jobTriggerSummary } from "./trigger"

// The canonical menu for a job, as items only. Editing a job edits all of
// it — schedule, instructions, access, visibility — so the item is plain
// "Edit" rather than the materials' "Rename…". Two triggers hold it:
// the page hangs it off the job's name in the breadcrumb, a list row off
// its "…" button. Both own the confirmation the delete passes through.

export type JobMenuActions = {
  isControlling: boolean
  isDeleting: boolean
  onDelete: (job: Job) => void
  onEdit: (job: Job) => void
  onMoveToFolder: (job: Job) => void
  onPausedChange: (job: Job, paused: boolean) => void
  /** Folder listings only: unfiling acts on the filing, not the job. */
  onUnfile?: (job: Job) => void
  job: Job
}

function JobMenuItems({
  isControlling,
  isDeleting,
  onDeleteRequest,
  onEdit,
  onMoveToFolder,
  onPausedChange,
  onUnfile,
  job,
}: Omit<JobMenuActions, "onDelete"> & { onDeleteRequest: () => void }) {
  return (
    <>
      <DropdownMenuItem onSelect={() => onEdit(job)}>
        <Pencil />
        Edit
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onMoveToFolder(job)}>
        <FolderInput />
        Move to folder…
      </DropdownMenuItem>
      {onUnfile === undefined ? null : (
        <DropdownMenuItem onSelect={() => onUnfile(job)}>
          <FolderMinus />
          Remove from folder
        </DropdownMenuItem>
      )}
      <JobControlItem
        isControlling={isControlling}
        onPausedChange={onPausedChange}
        job={job}
      />
      <DropdownMenuSeparator />
      <DropdownMenuItem
        disabled={isDeleting}
        onSelect={onDeleteRequest}
        variant="destructive"
      >
        {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
        {isDeleting ? "Deleting" : "Delete"}
      </DropdownMenuItem>
    </>
  )
}

/** Pausing only means something for a job with runs still ahead of
 *  it, so a one-off or a finished one offers nothing here. */
function JobControlItem({
  isControlling,
  onPausedChange,
  job,
}: Pick<JobMenuActions, "isControlling" | "onPausedChange" | "job">) {
  const controlAction = jobControlAction(job)

  if (controlAction === undefined) {
    return null
  }

  const shouldPause = controlAction === "pause"
  const pendingLabel = shouldPause ? "Pausing" : "Resuming"
  const ControlIcon = shouldPause ? Pause : Play

  return (
    <DropdownMenuItem
      disabled={isControlling}
      onSelect={() => onPausedChange(job, shouldPause)}
    >
      {isControlling ? <Loader2 className="animate-spin" /> : <ControlIcon />}
      {isControlling ? pendingLabel : shouldPause ? "Pause" : "Resume"}
    </DropdownMenuItem>
  )
}

/** The job's own first lines for its title menu: whose it is, how fresh
 *  it is, and how it starts. */
function JobLead({ job }: { job: Job }) {
  return (
    <MenuProvenance
      detail={jobTriggerSummary(job).title}
      owner={materialOwner(job)}
      updatedAt={job.updatedAt}
    />
  )
}

/** The job's menu for its breadcrumb name on its page; the shell owns
 *  the trigger, so this publishes the content only, led by the page's
 *  own lines ahead of the actions every job shares. */
export function JobTitleMenu(props: JobMenuActions) {
  const confirm = useDeleteConfirmation(props)

  return (
    <>
      <TitleMenuContent lead={<JobLead job={props.job} />}>
        <JobMenuItems {...props} onDeleteRequest={confirm.request} />
      </TitleMenuContent>
      {confirm.dialog}
    </>
  )
}

/** The same menu on a list row, trigger and all. */
export function JobRowMenu(props: JobMenuActions) {
  const confirm = useDeleteConfirmation(props)

  return (
    <>
      <DropdownMenu>
        <RowMenuTrigger name={props.job.name} />
        <DropdownMenuContent align="end" className={menuWidth}>
          <JobMenuItems {...props} onDeleteRequest={confirm.request} />
        </DropdownMenuContent>
      </DropdownMenu>
      {confirm.dialog}
    </>
  )
}

function useDeleteConfirmation({ isDeleting, job, onDelete }: JobMenuActions) {
  const [isOpen, setIsOpen] = useState(false)

  return {
    request: () => setIsOpen(true),
    dialog: (
      <DeleteJobDialog
        isDeleting={isDeleting}
        job={job}
        onDelete={() => onDelete(job)}
        onOpenChange={setIsOpen}
        open={isOpen}
      />
    ),
  }
}
