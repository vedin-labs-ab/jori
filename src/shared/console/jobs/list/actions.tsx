import {
  FolderInput,
  FolderMinus,
  Loader2,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { menuWidth } from "@/shared/console/menu"
import { type Job, jobControlAction } from "../types"

// The canonical menu for a job, as items only. Editing a job
// edits all of it — schedule, instructions, access — so the item
// is plain "Edit" rather than the materials' "Edit details".

type JobMenuActions = {
  isControlling: boolean
  isDeleting: boolean
  onDeleteRequest: () => void
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
}: JobMenuActions) {
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

/** The same menu on a list row, trigger and all. The confirmation the
 *  delete opens stays with the host, which knows what it deletes. */
export function JobRowMenu(props: JobMenuActions) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Open actions for ${props.job.name}`}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={menuWidth}>
        <JobMenuItems {...props} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
