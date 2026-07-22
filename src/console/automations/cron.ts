import { classifyCron as classifyCronExpression } from "@contracts/automations/schedule/classify"
import {
  getNextCronRunAt,
  validateCronExpression,
} from "@contracts/automations/schedule/cron"
import { ordinal } from "@contracts/automations/schedule/labels"
import { readErrorMessage } from "../shared/error"
import { type AutomationFormValues, emptyAutomationForm } from "./types"

export { describeCron } from "@contracts/automations/schedule/labels"

type CronParts = Pick<
  AutomationFormValues,
  "cron" | "monthDay" | "repeat" | "time" | "timezone" | "weekday"
>

export const weekdayOptions = [
  { label: "Monday", value: "1" },
  { label: "Tuesday", value: "2" },
  { label: "Wednesday", value: "3" },
  { label: "Thursday", value: "4" },
  { label: "Friday", value: "5" },
  { label: "Saturday", value: "6" },
  { label: "Sunday", value: "0" },
] as const

export const monthDayOptions = Array.from({ length: 31 }, (_, index) => ({
  label: ordinal(index + 1),
  value: String(index + 1),
}))

const defaultParts: CronParts = {
  cron: emptyAutomationForm.cron,
  monthDay: emptyAutomationForm.monthDay,
  repeat: emptyAutomationForm.repeat,
  time: emptyAutomationForm.time,
  timezone: emptyAutomationForm.timezone,
  weekday: emptyAutomationForm.weekday,
}

export function classifyCron(cron: string | undefined): CronParts {
  const trimmed = cron?.trim() ?? ""

  if (trimmed === "") {
    return defaultParts
  }

  const custom: CronParts = { ...defaultParts, cron: trimmed, repeat: "custom" }
  const classified = classifyCronExpression(trimmed)

  if (classified === null) {
    return custom
  }

  return {
    ...custom,
    repeat: classified.repeat,
    time: classified.time,
    ...(classified.dayOfWeek === undefined
      ? {}
      : { weekday: classified.dayOfWeek }),
    ...(classified.dayOfMonth === undefined
      ? {}
      : { monthDay: classified.dayOfMonth }),
  }
}

export function composeCron(parts: CronParts) {
  if (parts.repeat === "custom") {
    return parts.cron.trim()
  }

  const time = parseTime(parts.time)

  if (time === null) {
    return ""
  }

  const prefix = `${time.minute} ${time.hour}`

  if (parts.repeat === "weekdays") {
    return `${prefix} * * 1-5`
  }

  if (parts.repeat === "weekly") {
    return `${prefix} * * ${parts.weekday}`
  }

  if (parts.repeat === "monthly") {
    return `${prefix} ${parts.monthDay} * *`
  }

  return `${prefix} * * *`
}

export function buildRecurringCron(
  parts: CronParts
): { cron: string } | { error: string } {
  if (parts.repeat === "custom" && parts.cron.trim() === "") {
    return { error: "Cron expression is required." }
  }

  if (parts.repeat !== "custom" && parseTime(parts.time) === null) {
    return { error: "Time is required." }
  }

  const cron = composeCron(parts)

  try {
    validateCronExpression(cron)
    return { cron }
  } catch (error) {
    return { error: readErrorMessage(error, "Invalid cron expression.") }
  }
}

export function previewRecurringRun(
  parts: CronParts,
  now: number
): { runAt: number } | { error: string } {
  const built = buildRecurringCron(parts)

  if ("error" in built) {
    return built
  }

  try {
    return { runAt: getNextCronRunAt(built.cron, now, parts.timezone) }
  } catch (error) {
    return { error: readErrorMessage(error, "No upcoming runs.") }
  }
}

export function getCrontabGuruUrl(cron: string) {
  const expression = cron.trim().split(/\s+/).filter(Boolean).join("_")

  return expression === ""
    ? "https://crontab.guru/"
    : `https://crontab.guru/#${encodeURI(expression)}`
}

function parseTime(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time)

  if (match === null) {
    return null
  }

  return { hour: Number(match[1]), minute: Number(match[2]) }
}
