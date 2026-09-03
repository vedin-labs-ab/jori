import { getJobEventDefinition } from "@contracts/jobs/events"
import { classifyCron } from "@contracts/jobs/schedule/classify"
import { ordinal, weekdayLabels } from "@contracts/jobs/schedule/labels"
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

/** How a job starts, read cadence first: the title is the word a reader
 *  scans a column of jobs by, the detail is what that word leaves out,
 *  and the fuller form spells the same fact out with its zone. */
export type JobTriggerSummary = {
  /** Compact enough for a list cell; absent when the title says it all. */
  detail?: ReactNode
  /** The list's tooltip, and the line on the job's own page. */
  full?: string
  title: string
}

export function jobTriggerSummary(job: Job): JobTriggerSummary {
  const trigger = job.trigger

  if (job.type === "cron" && "expression" in trigger) {
    return cronSummary(trigger.expression, trigger.timezone)
  }

  if (job.type === "event" && "event" in trigger) {
    return { detail: eventTriggerDetail(trigger), title: "Event" }
  }

  if ("at" in trigger) {
    return {
      detail: shortDate(trigger.at),
      full: absoluteTime(trigger.at),
      title: "Once",
    }
  }

  return { title: "Once" }
}

/** A schedule named by its cadence, with the day and time it lands on
 *  beside it: "Weekly · Fri 15:00". The zone waits in the fuller form,
 *  since a column of jobs almost always shares one, and an expression the
 *  words cannot hold stays an expression. */
function cronSummary(
  expression: string | undefined,
  timezone: string
): JobTriggerSummary {
  const cron = classifyCron(expression)

  if (cron === null) {
    return {
      detail: expression,
      full: `${expression ?? ""} ${timezone}`.trim(),
      title: "Custom",
    }
  }

  const zoned = `${cron.time} ${timezone}`
  const weekday = weekdayLabels[cron.dayOfWeek ?? ""]

  if (cron.repeat === "weekly" && weekday !== undefined) {
    return {
      detail: `${weekday.slice(0, 3)} ${cron.time}`,
      full: `${weekday}s at ${zoned}`,
      title: "Weekly",
    }
  }

  if (cron.repeat === "monthly" && cron.dayOfMonth !== undefined) {
    const day = ordinal(Number(cron.dayOfMonth))

    return {
      detail: `${day} ${cron.time}`,
      full: `${day} at ${zoned}`,
      title: "Monthly",
    }
  }

  return {
    detail: cron.time,
    full: zoned,
    title: cron.repeat === "weekdays" ? "Weekdays" : "Daily",
  }
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
