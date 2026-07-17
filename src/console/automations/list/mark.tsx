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
import { type Automation } from "../types"

export function AutomationStatusMark({
  isControlling,
  isDeleting,
  onDeleteRequest,
  onPause,
  onResume,
  automation,
}: {
  isControlling: boolean
  isDeleting: boolean
  onDeleteRequest: () => void
  onPause: (automation: Automation) => void
  onResume: (automation: Automation) => void
  automation: Automation
}) {
  const [isActionVisible, setIsActionVisible] = useState(false)
  const action = automationStatusAction(automation)

  if (action === undefined) {
    return (
      <span
        aria-label={`${automationStatusLabel(automation)} automation`}
        className={statusMarkClassName}
        role="img"
      >
        <StaticStatusIcon automation={automation} />
      </span>
    )
  }

  const label = statusActionLabel(action, automation.name)
  const isBusy = action === "delete" ? isDeleting : isControlling
  const onClick = statusActionClick({
    action,
    automation,
    onDeleteRequest,
    onPause,
    onResume,
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
            <StaticStatusIcon automation={automation} />
          ) : (
            <StatusIcon automation={automation} />
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

function automationStatusLabel(automation: Automation) {
  if (automation.status === "completed") {
    return "Completed"
  }

  if (automation.type === "once") {
    return "One-time"
  }

  return automation.status === "paused" ? "Paused" : "Active"
}

function automationStatusAction(
  automation: Automation
): StatusAction | undefined {
  if (automation.type === "once") {
    return "delete"
  }

  if (automation.status === "completed") {
    return undefined
  }

  return automation.status === "paused" ? "resume" : "pause"
}

function StaticStatusIcon({ automation }: { automation: Automation }) {
  if (automation.type === "once" && automation.status !== "completed") {
    return (
      <CalendarClock
        aria-hidden="true"
        className="size-5"
        data-testid="automation-once-icon"
      />
    )
  }

  return (
    <Check
      aria-hidden="true"
      className="size-5"
      data-testid="automation-completed-icon"
    />
  )
}

function StatusIcon({ automation }: { automation: Automation }) {
  if (automation.type === "event") {
    return (
      <Plug
        aria-hidden="true"
        className="size-5"
        data-testid="automation-event-icon"
      />
    )
  }

  return (
    <CalendarSync
      aria-hidden="true"
      className="size-5"
      data-testid="automation-cron-icon"
    />
  )
}

function ActionIcon({ action }: { action: StatusAction }) {
  if (action === "delete") {
    return (
      <Trash2
        aria-hidden="true"
        data-testid="automation-delete-icon"
        className="size-5"
      />
    )
  }

  if (action === "pause") {
    return (
      <Pause
        aria-hidden="true"
        data-testid="automation-pause-icon"
        className="size-5"
      />
    )
  }

  return (
    <Play
      aria-hidden="true"
      data-testid="automation-resume-icon"
      className="size-5"
    />
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
  automation,
  onDeleteRequest,
  onPause,
  onResume,
}: {
  action: StatusAction
  automation: Automation
  onDeleteRequest: () => void
  onPause: (automation: Automation) => void
  onResume: (automation: Automation) => void
}) {
  if (action === "delete") {
    return onDeleteRequest
  }

  return () => {
    if (action === "pause") {
      onPause(automation)
    } else {
      onResume(automation)
    }
  }
}
