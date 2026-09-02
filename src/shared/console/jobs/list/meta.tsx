import { getJobEventDefinition } from "@contracts/jobs/events"
import { describeCron } from "@contracts/jobs/schedule/labels"
import { Clock, Repeat2, Zap } from "lucide-react"
import { type ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { absoluteTime, relativeTime } from "@/shared/console/time"
import { FieldHelp } from "@/shared/field"
import { ProviderLogo } from "@/shared/logo/provider"
import { getJobSurfaceLabel } from "../access"
import { type Job } from "../types"
import { JobToolSummary } from "./tools"

export function JobMeta({ now, job }: { now: number; job: Job }) {
  const trigger = triggerSummary(job)

  return (
    <div className="grid text-xs sm:grid-cols-[1.1fr_0.9fr_0.95fr]">
      <JobMetaCell
        className="border-b sm:border-r sm:border-b-0"
        icon={trigger.icon}
      >
        <span className="truncate font-medium text-foreground">
          {trigger.title}
        </span>
        <JobMetaDetail tooltip={trigger.detailTitle}>
          {trigger.detail}
        </JobMetaDetail>
      </JobMetaCell>
      <JobToolMetaCell className="border-b sm:border-r sm:border-b-0">
        <JobToolSummary job={job} />
      </JobToolMetaCell>
      <JobMetaCell icon={<Clock className={metaIconClassName} />}>
        <JobRuns now={now} job={job} />
      </JobMetaCell>
    </div>
  )
}

function JobMetaCell({
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

function JobMetaDetail({
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

function JobToolMetaCell({
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

function triggerSummary(job: Job) {
  const trigger = job.trigger

  if (job.type === "cron" && "expression" in trigger) {
    const detail =
      describeCron(trigger.expression, trigger.timezone) ??
      `${trigger.expression} ${trigger.timezone}`

    return {
      detail,
      detailTitle: detail,
      icon: <Repeat2 className={metaIconClassName} />,
      title: "Recurring",
    }
  }

  if (job.type === "event" && "event" in trigger) {
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

function eventTriggerIcon(trigger: Extract<Job["trigger"], { event: string }>) {
  const integration = "integration" in trigger ? trigger.integration : undefined

  if (integration === undefined) {
    return <Zap className={metaIconClassName} />
  }

  return (
    <ProviderLogo
      className="mt-0.5 size-3.5 rounded-sm"
      surface={integration}
    />
  )
}

function eventTriggerDetail(
  trigger: Extract<Job["trigger"], { event: string }>
) {
  const integration = "integration" in trigger ? trigger.integration : undefined
  const eventLabel =
    integration === undefined
      ? trigger.event
      : (getJobEventDefinition(integration, trigger.event)?.label ??
        trigger.event)
  const source =
    integration === undefined ? "Integration" : getJobSurfaceLabel(integration)

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="truncate">{source}</span>
      <FieldHelp label={`Event: ${eventLabel}`} side="top">
        {eventLabel}
      </FieldHelp>
    </span>
  )
}

function JobRuns({ now, job }: { now: number; job: Job }) {
  const nextAt =
    job.type === "cron" && "nextAt" in job.trigger
      ? job.trigger.nextAt
      : job.type === "once" && "at" in job.trigger
        ? job.trigger.at
        : undefined
  const primary = runPrimaryLabel(job, nextAt, now)

  return (
    <>
      <span
        className="truncate font-medium text-foreground"
        title={primary.title}
      >
        {primary.label}
      </span>
      {job.firedAt === undefined ? (
        <span className="truncate text-muted-foreground">Never run</span>
      ) : (
        <span
          className="truncate text-muted-foreground"
          title={absoluteTime(job.firedAt)}
        >
          Ran {relativeTime(job.firedAt, now)}
        </span>
      )}
    </>
  )
}

function runPrimaryLabel(job: Job, nextAt: number | undefined, now: number) {
  if (job.status === "completed") {
    return { label: "Completed", title: undefined }
  }

  if (job.status === "paused") {
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
