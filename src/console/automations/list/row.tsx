import {
  CalendarClock,
  Check,
  CirclePause,
  CirclePlay,
  Loader2,
  Pause,
  Play,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
        <CardHeader className="grid-cols-[auto_minmax(0,1fr)_auto] gap-3 p-4 sm:p-5">
          <AutomationStatusMark
            isControlling={isControlling}
            onPause={onPause}
            onResume={onResume}
            automation={automation}
          />
          <div className="grid min-w-0 gap-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <CardTitle className="truncate text-sm">
                {automation.name}
              </CardTitle>
              {automation.status === "completed" ? (
                <Badge className="shrink-0" variant="outline">
                  Completed
                </Badge>
              ) : automation.status === "paused" ? (
                <Badge className="shrink-0" variant="secondary">
                  Paused
                </Badge>
              ) : null}
            </div>
            <p className="line-clamp-3 max-w-[72ch] text-muted-foreground text-xs/relaxed">
              {automation.instructions}
            </p>
          </div>
          <div className="col-start-3 row-start-1 self-start justify-self-end">
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
        </CardHeader>
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
          className={`${statusMarkClassName} group/status relative transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-60`}
          disabled={isControlling}
          onClick={() => onClick(automation)}
          type="button"
        >
          {isControlling ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <StatusIcon
                className="transition-opacity group-hover/status:opacity-0 group-focus-visible/status:opacity-0"
                automation={automation}
              />
              <ActionIcon
                action={controlAction}
                className="absolute opacity-0 transition-opacity group-hover/status:opacity-100 group-focus-visible/status:opacity-100"
              />
            </>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

const statusMarkClassName =
  "flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted"

function automationStatusLabel(automation: Automation) {
  if (automation.status === "completed") {
    return "Completed"
  }

  if (automation.type === "once") {
    return "One-time"
  }

  return automation.status === "paused" ? "Paused" : "Active"
}

function automationControlAction(automation: Automation) {
  if (automation.type === "once" || automation.status === "completed") {
    return undefined
  }

  return automation.status === "paused" ? "resume" : "pause"
}

function StaticStatusIcon({ automation }: { automation: Automation }) {
  if (automation.type === "once") {
    return <CalendarClock className="size-5 text-muted-foreground" />
  }

  return <Check className="size-6" />
}

function StatusIcon({
  className,
  automation,
}: {
  className?: string
  automation: Automation
}) {
  if (automation.status === "paused") {
    return <CirclePause className={className} size={22} strokeWidth={2.25} />
  }

  return <CirclePlay className={className} size={22} strokeWidth={2.25} />
}

function ActionIcon({
  action,
  className,
}: {
  action: "pause" | "resume"
  className?: string
}) {
  if (action === "pause") {
    return <Pause className={className} size={20} strokeWidth={2.25} />
  }

  return <Play className={className} size={20} strokeWidth={2.25} />
}
