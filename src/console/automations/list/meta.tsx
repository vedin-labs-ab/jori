import { getAutomationEventDefinition } from "@contracts/automations/events"
import { CircleHelp, Clock, Repeat2, Zap } from "lucide-react"
import { type ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { absoluteTime, relativeTime } from "../../shared/time"
import { getAutomationSurfaceLabel } from "../access"
import { SurfaceLogo } from "../access/logo"
import { describeCron } from "../cron"
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
        icon={trigger.icon}
      >
        <span className="truncate font-medium text-foreground">
          {trigger.title}
        </span>
        <AutomationMetaDetail tooltip={trigger.detailTitle}>
          {trigger.detail}
        </AutomationMetaDetail>
      </AutomationMetaCell>
      <AutomationToolMetaCell className="border-b sm:border-r sm:border-b-0">
        <AutomationToolSummary automation={automation} />
      </AutomationToolMetaCell>
      <AutomationMetaCell icon={<Clock className={metaIconClassName} />}>
        <AutomationRuns now={now} automation={automation} />
      </AutomationMetaCell>
    </div>
  )
}

function AutomationMetaCell({
  children,
  className,
  icon,
}: {
  children: ReactNode
  className?: string
  icon: ReactNode
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2 px-4 py-3 sm:px-5",
        className
      )}
    >
      {icon}
      <div className="grid min-w-0 gap-0.5">{children}</div>
    </div>
  )
}

const metaIconClassName = "mt-0.5 size-3.5 shrink-0 text-muted-foreground"

function AutomationMetaDetail({
  children,
  tooltip,
}: {
  children: ReactNode
  tooltip: string | undefined
}) {
  if (tooltip === undefined) {
    return <span className="truncate text-muted-foreground">{children}</span>
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="min-w-0 truncate rounded-sm border-0 bg-transparent p-0 text-left text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
          type="button"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
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

  if (automation.type === "cron" && "expression" in trigger) {
    const detail =
      describeCron(trigger.expression) ?? `${trigger.expression} UTC`

    return {
      detail,
      detailTitle: detail,
      icon: <Repeat2 className={metaIconClassName} />,
      title: "Recurring",
    }
  }

  if (automation.type === "event" && "event" in trigger) {
    return {
      detail: eventTriggerDetail(trigger),
      detailTitle: undefined,
      icon: eventTriggerIcon(trigger),
      title: "Event",
    }
  }

  return {
    detail: "at" in trigger ? absoluteTime(trigger.at) : "One time",
    detailTitle: "at" in trigger ? absoluteTime(trigger.at) : undefined,
    icon: <Clock className={metaIconClassName} />,
    title: "One time",
  }
}

function eventTriggerIcon(
  trigger: Extract<Automation["trigger"], { event: string }>
) {
  const integration = "integration" in trigger ? trigger.integration : undefined

  if (integration === undefined) {
    return <Zap className={metaIconClassName} />
  }

  return (
    <SurfaceLogo
      className="mt-0.5 size-3.5 rounded-sm"
      integration={integration}
    />
  )
}

function eventTriggerDetail(
  trigger: Extract<Automation["trigger"], { event: string }>
) {
  const integration = "integration" in trigger ? trigger.integration : undefined
  const eventLabel =
    integration === undefined
      ? trigger.event
      : (getAutomationEventDefinition(integration, trigger.event)?.label ??
        trigger.event)
  const source =
    integration === undefined
      ? "Integration"
      : getAutomationSurfaceLabel(integration)

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
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
    automation.type === "cron" && "nextAt" in automation.trigger
      ? automation.trigger.nextAt
      : automation.type === "once" && "at" in automation.trigger
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
      {automation.firedAt === undefined ? (
        <span className="truncate text-muted-foreground">Never run</span>
      ) : (
        <span
          className="truncate text-muted-foreground"
          title={absoluteTime(automation.firedAt)}
        >
          Ran {relativeTime(automation.firedAt, now)}
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

  if (automation.status === "paused") {
    return { label: "Paused", title: undefined }
  }

  if (nextAt === undefined) {
    return { label: "Monitoring", title: undefined }
  }

  const prefix = nextAt > now ? "Next" : "Scheduled"

  return {
    label: `${prefix} ${relativeTime(nextAt, now)}`,
    title: absoluteTime(nextAt),
  }
}
