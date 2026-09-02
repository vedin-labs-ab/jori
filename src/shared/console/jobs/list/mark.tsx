import {
  CalendarClock,
  CalendarSync,
  Check,
  Loader2,
  Pause,
  Play,
  Plug,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { type Job, jobControlAction } from "../types"

export function JobStatusMark({
  isControlling,
  isDeleting,
  onDeleteRequest,
  onPausedChange,
  job,
}: {
  isControlling: boolean
  isDeleting: boolean
  onDeleteRequest: () => void
  onPausedChange: (job: Job, paused: boolean) => void
  job: Job
}) {
  const [isActionVisible, setIsActionVisible] = useState(false)
  const action = jobStatusAction(job)

  if (action === undefined) {
    return (
      <span
        aria-label={`${jobStatusLabel(job)} job`}
        className={statusMarkClassName}
        role="img"
      >
        <StaticStatusIcon job={job} />
      </span>
    )
  }

  const label = statusActionLabel(action, job.name)
  const isBusy = action === "delete" ? isDeleting : isControlling
  const onClick = statusActionClick({
    action,
    job,
    onDeleteRequest,
    onPausedChange,
  })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={label}
          className={`${statusMarkClassName} transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-60`}
          disabled={isBusy}
          onBlur={() => setIsActionVisible(false)}
          onClick={onClick}
          onFocus={() => setIsActionVisible(true)}
          onPointerEnter={() => setIsActionVisible(true)}
          onPointerLeave={() => setIsActionVisible(false)}
          type="button"
        >
          {isBusy ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : isActionVisible ? (
            <ActionIcon action={action} />
          ) : action === "delete" ? (
            <StaticStatusIcon job={job} />
          ) : (
            <StatusIcon job={job} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

const statusMarkClassName =
  "flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted text-foreground"

type StatusAction = "delete" | "pause" | "resume"

function jobStatusLabel(job: Job) {
  if (job.status === "completed") {
    return "Completed"
  }

  if (job.type === "once") {
    return "One-time"
  }

  return job.status === "paused" ? "Paused" : "Active"
}

function jobStatusAction(job: Job): StatusAction | undefined {
  if (job.type === "once") {
    return "delete"
  }

  return jobControlAction(job)
}

function StaticStatusIcon({ job }: { job: Job }) {
  if (job.type === "once" && job.status !== "completed") {
    return (
      <CalendarClock
        aria-hidden="true"
        className="size-5"
        data-testid="job-once-icon"
      />
    )
  }

  return (
    <Check
      aria-hidden="true"
      className="size-5"
      data-testid="job-completed-icon"
    />
  )
}

function StatusIcon({ job }: { job: Job }) {
  if (job.type === "event") {
    return (
      <Plug
        aria-hidden="true"
        className="size-5"
        data-testid="job-event-icon"
      />
    )
  }

  return (
    <CalendarSync
      aria-hidden="true"
      className="size-5"
      data-testid="job-cron-icon"
    />
  )
}

function ActionIcon({ action }: { action: StatusAction }) {
  if (action === "delete") {
    return (
      <Trash2
        aria-hidden="true"
        data-testid="job-delete-icon"
        className="size-5"
      />
    )
  }

  if (action === "pause") {
    return (
      <Pause
        aria-hidden="true"
        data-testid="job-pause-icon"
        className="size-5"
      />
    )
  }

  return (
    <Play aria-hidden="true" data-testid="job-resume-icon" className="size-5" />
  )
}

function statusActionLabel(action: StatusAction, name: string) {
  if (action === "delete") {
    return `Delete ${name}`
  }

  return action === "pause" ? `Pause ${name}` : `Resume ${name}`
}

function statusActionClick({
  action,
  job,
  onDeleteRequest,
  onPausedChange,
}: {
  action: StatusAction
  job: Job
  onDeleteRequest: () => void
  onPausedChange: (job: Job, paused: boolean) => void
}) {
  if (action === "delete") {
    return onDeleteRequest
  }

  return () => onPausedChange(job, action === "pause")
}
