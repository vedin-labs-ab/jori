import {
  CalendarClock,
  CalendarSync,
  Check,
  Loader2,
  Pause,
  Play,
  Plug,
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
  return (
    <li className="min-w-0">
      <Card className="h-full gap-0 py-0 ring-inset transition-colors hover:bg-muted/20">
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 p-4 sm:p-5">
          <AutomationStatusMark
            isControlling={isControlling}
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
                onDelete={onDelete}
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
    </li>
  )
}

function AutomationStatusMark({
  isControlling,
  onPause,
  onResume,
  automation,
}: {
  isControlling: boolean
  onPause: (automation: Automation) => void
  onResume: (automation: Automation) => void
  automation: Automation
}) {
  const [isActionVisible, setIsActionVisible] = useState(false)
  const controlAction = automationControlAction(automation)

  if (controlAction === undefined) {
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

  const label =
    controlAction === "pause"
      ? `Pause ${automation.name}`
      : `Resume ${automation.name}`
  const onClick = controlAction === "pause" ? onPause : onResume

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={label}
          className={`${statusMarkClassName} transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-60`}
          disabled={isControlling}
          onBlur={() => setIsActionVisible(false)}
          onClick={() => onClick(automation)}
          onFocus={() => setIsActionVisible(true)}
          onPointerEnter={() => setIsActionVisible(true)}
          onPointerLeave={() => setIsActionVisible(false)}
          type="button"
        >
          {isControlling ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : isActionVisible ? (
            <ActionIcon action={controlAction} />
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

function automationStatusLabel(automation: Automation) {
  if (automation.status === "completed") {
    return "Completed"
  }

  if (automation.type === "once") {
    return "One-time"
  }

  return automation.status === "paused" ? "Paused" : "Active"
}

function shouldShowCompletedBadge(automation: Automation) {
  return automation.status === "completed" && automation.type !== "once"
}

function automationControlAction(automation: Automation) {
  if (automation.type === "once" || automation.status === "completed") {
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

function ActionIcon({ action }: { action: "pause" | "resume" }) {
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
