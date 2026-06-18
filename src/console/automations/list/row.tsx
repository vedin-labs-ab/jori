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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { type Automation } from "../types"
import { AutomationActions } from "./actions"
import { DeleteAutomationDialog } from "./delete"
import { AutomationMeta } from "./meta"

export function AutomationRow({
  isControlling,
  isDeleting,
  now,
  onDelete,
  onEdit,
  onPause,
  onResume,
  automation,
}: {
  isControlling: boolean
  isDeleting: boolean
  now: number
  onDelete: (automation: Automation) => void
  onEdit: (automation: Automation) => void
  onPause: (automation: Automation) => void
  onResume: (automation: Automation) => void
  automation: Automation
}) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const requestDelete = () => setIsDeleteOpen(true)

  return (
    <li className="min-w-0">
      <Card className="h-full gap-0 py-0 ring-inset transition-colors hover:bg-muted/20">
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 p-4 sm:p-5">
          <AutomationStatusMark
            isControlling={isControlling}
            isDeleting={isDeleting}
            onDeleteRequest={requestDelete}
            onPause={onPause}
            onResume={onResume}
            automation={automation}
          />
          <div className="grid min-w-0 content-start gap-1.5">
            <div className="grid min-h-6 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate font-heading text-sm font-medium">
                  {automation.name}
                </h3>
                {shouldShowCompletedBadge(automation) ? (
                  <Badge className="shrink-0" variant="outline">
                    Completed
                  </Badge>
                ) : automation.status === "paused" ? (
                  <Badge className="shrink-0" variant="secondary">
                    Paused
                  </Badge>
                ) : null}
              </div>
              <AutomationActions
                isControlling={isControlling}
                isDeleting={isDeleting}
                onDeleteRequest={requestDelete}
                onEdit={onEdit}
                onPause={onPause}
                onResume={onResume}
                automation={automation}
              />
            </div>
            <p className="line-clamp-3 max-w-[72ch] text-muted-foreground text-xs/relaxed">
              {automation.instructions}
            </p>
          </div>
        </div>
        <CardContent className="mt-auto border-t bg-muted/20 p-0">
          <AutomationMeta now={now} automation={automation} />
        </CardContent>
      </Card>
      <DeleteAutomationDialog
        isDeleting={isDeleting}
        onDelete={() => onDelete(automation)}
        onOpenChange={setIsDeleteOpen}
        open={isDeleteOpen}
        automation={automation}
      />
    </li>
  )
}

function AutomationStatusMark({
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

function shouldShowCompletedBadge(automation: Automation) {
  return automation.status === "completed" && automation.type !== "once"
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
