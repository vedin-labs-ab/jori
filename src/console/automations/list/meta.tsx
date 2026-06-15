import { getAutomationEventDefinition } from "@contracts/automations/events"
import { CircleHelp, Clock, Repeat2, Zap } from "lucide-react"
import { type ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getAutomationSurfaceLabel } from "../access"
import { SurfaceLogo } from "../access/logo"
import { describeCron } from "../cron"
import { absoluteTime, relativeTime } from "../format"
import { type Automation } from "../types"
import { AutomationToolSummary } from "./tools"

export function AutomationMeta({
  now,
  automation,
}: {
  now: number
  automation: Automation
}) {
  const trigger = triggerSummary(automation)

  return (
    <div className="grid text-xs sm:grid-cols-[1.1fr_0.9fr_0.95fr]">
      <AutomationMetaCell
        className="border-b sm:border-r sm:border-b-0"
        icon={trigger.Icon}
      >
        <span className="truncate font-medium text-foreground">
          {trigger.title}
        </span>
        <span
          className="truncate text-muted-foreground"
          title={trigger.detailTitle}
        >
          {trigger.detail}
        </span>
      </AutomationMetaCell>
      <AutomationToolMetaCell className="border-b sm:border-r sm:border-b-0">
        <AutomationToolSummary automation={automation} />
      </AutomationToolMetaCell>
      <AutomationMetaCell icon={Clock}>
        <AutomationRuns now={now} automation={automation} />
      </AutomationMetaCell>
    </div>
  )
}

function AutomationMetaCell({
  children,
  className,
  icon: Icon,
}: {
  children: ReactNode
  className?: string
  icon: typeof Clock
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2 px-4 py-3 sm:px-5",
        className
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="grid min-w-0 gap-0.5">{children}</div>
    </div>
  )
}

function AutomationToolMetaCell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center px-4 py-3 sm:justify-center sm:px-5",
        className
      )}
    >
      {children}
    </div>
  )
}

function triggerSummary(automation: Automation) {
  const trigger = automation.trigger

  if (trigger.type === "cron") {
    const detail = describeCron(trigger.cron) ?? `${trigger.cron} UTC`

    return {
      detail,
      detailTitle: detail,
      Icon: Repeat2,
      title: "Recurring",
    }
  }

  if (trigger.type === "event") {
    return {
      detail: eventTriggerDetail(trigger),
      detailTitle: undefined,
      Icon: Zap,
      title: "Event",
    }
  }

  return {
    detail: absoluteTime(trigger.at),
    detailTitle: absoluteTime(trigger.at),
    Icon: Clock,
    title: "One time",
  }
}

function eventTriggerDetail(
  trigger: Extract<Automation["trigger"], { type: "event" }>
) {
  const eventLabel =
    trigger.integration === undefined
      ? trigger.event
      : (getAutomationEventDefinition(trigger.integration, trigger.event)
          ?.label ?? trigger.event)
  const source =
    trigger.integration === undefined
      ? "Integration"
      : getAutomationSurfaceLabel(trigger.integration)

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {trigger.integration === undefined ? null : (
        <SurfaceLogo
          className="size-3.5 rounded-sm"
          integration={trigger.integration}
        />
      )}
      <span className="truncate">{source}</span>
      <EventTriggerHelp eventLabel={eventLabel} />
    </span>
  )
}

function EventTriggerHelp({ eventLabel }: { eventLabel: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={`Event: ${eventLabel}`}
          className="inline-flex size-3 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          type="button"
        >
          <CircleHelp className="size-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        align="center"
        className="max-w-72 items-start text-left leading-relaxed"
        side="top"
      >
        {eventLabel}
      </TooltipContent>
    </Tooltip>
  )
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
  const primary = runPrimaryLabel(automation, nextAt, now)

  return (
    <>
      <span
        className="truncate font-medium text-foreground"
        title={primary.title}
      >
        {primary.label}
      </span>
      {automation.lastRunAt === undefined ? (
        <span className="truncate text-muted-foreground">Never run</span>
      ) : (
        <span
          className="truncate text-muted-foreground"
          title={absoluteTime(automation.lastRunAt)}
        >
          Ran {relativeTime(automation.lastRunAt, now)}
        </span>
      )}
    </>
  )
}

function runPrimaryLabel(
  automation: Automation,
  nextAt: number | undefined,
  now: number
) {
  if (automation.status === "completed") {
    return { label: "Completed", title: undefined }
  }

  if (nextAt === undefined) {
    return { label: "Waiting for event", title: undefined }
  }

  const prefix = nextAt > now ? "Next" : "Scheduled"

  return {
    label: `${prefix} ${relativeTime(nextAt, now)}`,
    title: absoluteTime(nextAt),
  }
}
