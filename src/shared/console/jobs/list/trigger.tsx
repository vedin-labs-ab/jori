import { getJobEventDefinition } from "@contracts/jobs/events"
import { describeCron } from "@contracts/jobs/schedule/labels"
import {
  CalendarClock,
  CalendarSync,
  Check,
  type LucideIcon,
  Plug,
} from "lucide-react"
import { type ReactNode } from "react"
import { FieldHelp } from "@/shared/field"
import { ProviderLogo } from "@/shared/logo/provider"
import { absoluteTime, shortDate } from "../../time"
import { getJobSurfaceLabel } from "../access"
import { type Job } from "../types"

// What a job's trigger says about it, derived once for the list's cells,
// the page's Trigger row, and the sort behind Next run.

type EventTrigger = Extract<Job["trigger"], { event: string }>

/** How a job starts, in two parts: its kind, and the schedule, event
 *  source, or moment behind it, with a fuller title where the detail
 *  is abbreviated. */
export type JobTriggerSummary = {
  detail: ReactNode
  detailTitle: string | undefined
  title: string
}

export function jobTriggerSummary(job: Job): JobTriggerSummary {
  const trigger = job.trigger

  if (job.type === "cron" && "expression" in trigger) {
    const detail =
      describeCron(trigger.expression, trigger.timezone) ??
      `${trigger.expression} ${trigger.timezone}`

    return { detail, detailTitle: detail, title: "Recurring" }
  }

  if (job.type === "event" && "event" in trigger) {
    return {
      detail: eventTriggerDetail(trigger),
      detailTitle: undefined,
      title: "Event",
    }
  }

  if ("at" in trigger) {
    return {
      detail: shortDate(trigger.at),
      detailTitle: absoluteTime(trigger.at),
      title: "One-time",
    }
  }

  return { detail: "Once", detailTitle: undefined, title: "One-time" }
}

/** The source the event comes from, its mark first, and the event's own
 *  name behind a hint. */
function eventTriggerDetail(trigger: EventTrigger) {
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
      {integration === undefined ? null : (
        <ProviderLogo
          className="size-3.5 shrink-0 rounded-sm"
          surface={integration}
        />
      )}
      <span className="truncate">{source}</span>
      <FieldHelp label={`Event: ${eventLabel}`} side="top">
        {eventLabel}
      </FieldHelp>
    </span>
  )
}

/** The kind of job, as its list row and page mark it: what it waits on,
 *  or that it is done. */
export function jobTypeIcon(job: Job): LucideIcon {
  if (job.status === "completed") {
    return Check
  }

  if (job.type === "event") {
    return Plug
  }

  return job.type === "cron" ? CalendarSync : CalendarClock
}

/** When the job next runs: only an active job with a schedule has one. */
export function nextRunAt(job: Job) {
  if (job.status !== "active") {
    return undefined
  }

  if (job.type === "cron" && "nextAt" in job.trigger) {
    return job.trigger.nextAt
  }

  return job.type === "once" && "at" in job.trigger ? job.trigger.at : undefined
}
