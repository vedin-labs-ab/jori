import { Clock, Pencil, Repeat2, Workflow, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SeparatorDot } from "../dot"
import { describeCron } from "./cron"
import { DeleteAutomation } from "./delete"
import { absoluteTime, relativeTime } from "./format"
import { getAutomationSurfaceLabel } from "./surfaces"
import { type Automation } from "./types"

export function AutomationRow({
  isDeleting,
  now,
  onDelete,
  onEdit,
  automation,
}: {
  isDeleting: boolean
  now: number
  onDelete: (automation: Automation) => void
  onEdit: (automation: Automation) => void
  automation: Automation
}) {
  const TypeIcon = triggerIcon(automation)

  return (
    <article className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-md border bg-background p-3 md:grid-cols-[auto_1fr_auto] md:items-center">
      <TypeIcon
        aria-label={triggerLabel(automation)}
        className="mt-0.5 size-4 shrink-0 text-muted-foreground md:mt-0"
        role="img"
      />
      <div className="grid min-w-0 gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-sm">
            {automation.name}
          </span>
          {automation.status === "completed" ? (
            <Badge variant="outline">Completed</Badge>
          ) : null}
        </div>
        <p className="truncate text-muted-foreground text-xs">
          {automation.instructions}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
          <AutomationTrigger automation={automation} />
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Workflow className="size-3.5" />
            <span>{readScopeLabel(automation.access.readScope)}</span>
            <SeparatorDot />
            <span className="truncate">{surfaceSummary(automation)}</span>
          </span>
        </div>
      </div>
      <div className="col-span-2 flex items-center gap-3 justify-self-start md:col-span-1 md:justify-self-end">
        <AutomationRuns now={now} automation={automation} />
        <div className="flex items-center">
          <Button
            aria-label={`Edit ${automation.name}`}
            onClick={() => onEdit(automation)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Pencil />
          </Button>
          <DeleteAutomation
            isDeleting={isDeleting}
            onDelete={() => onDelete(automation)}
            automation={automation}
          />
        </div>
      </div>
    </article>
  )
}

function triggerIcon(automation: Automation) {
  if (automation.trigger.type === "cron") {
    return Repeat2
  }

  return automation.trigger.type === "event" ? Zap : Clock
}

function triggerLabel(automation: Automation) {
  if (automation.trigger.type === "cron") {
    return "Recurring automation"
  }

  return automation.trigger.type === "event"
    ? "Event automation"
    : "One-time automation"
}

function readScopeLabel(readScope: Automation["access"]["readScope"]) {
  return readScope === "allConnected"
    ? "Reads all connected"
    : "Reads mentioned"
}

function surfaceSummary(automation: Automation) {
  const writers = automation.access.surfaces.filter(
    (surface) => surface.access === "write" || surface.access === "both"
  )
  const surfaces = writers.length === 0 ? automation.access.surfaces : writers

  return surfaces
    .map((surface) => getAutomationSurfaceLabel(surface.provider))
    .join(", ")
}

function AutomationTrigger({ automation }: { automation: Automation }) {
  const trigger = automation.trigger

  if (trigger.type === "cron") {
    const description = describeCron(trigger.cron)

    if (description === null) {
      return <span className="font-mono">{trigger.cron} UTC</span>
    }

    return <span>{description}</span>
  }

  if (trigger.type === "event") {
    return (
      <span>
        {trigger.provider === undefined
          ? "Provider event"
          : getAutomationSurfaceLabel(trigger.provider)}{" "}
        {trigger.event}
      </span>
    )
  }

  return <span>Once at {absoluteTime(trigger.at)}</span>
}

function AutomationRuns({
  now,
  automation,
}: {
  now: number
  automation: Automation
}) {
  const nextAt =
    automation.trigger.type === "cron"
      ? automation.trigger.nextAt
      : automation.trigger.type === "once"
        ? automation.trigger.at
        : undefined

  return (
    <div className="grid gap-0.5 text-left text-xs md:text-right">
      {nextAt === undefined ? (
        <span className="text-muted-foreground">Event based</span>
      ) : (
        <span title={absoluteTime(nextAt)}>
          Next {relativeTime(nextAt, now)}
        </span>
      )}
      {automation.lastRunAt === undefined ? (
        <span className="text-muted-foreground">Never run</span>
      ) : (
        <span
          className="text-muted-foreground"
          title={absoluteTime(automation.lastRunAt)}
        >
          Ran {relativeTime(automation.lastRunAt, now)}
        </span>
      )}
    </div>
  )
}
