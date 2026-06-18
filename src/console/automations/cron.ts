import {
  getNextCronRunAt,
  validateCronExpression,
} from "@contracts/automations/schedule/cron"
import { readErrorMessage } from "../shared/error"
import { type AutomationFormValues, emptyAutomationForm } from "./types"

export { describeCron } from "@contracts/automations/schedule/labels"

export type CronParts = Pick<
  AutomationFormValues,
  "cron" | "monthDay" | "repeat" | "time" | "weekday"
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
  weekday: emptyAutomationForm.weekday,
}

export function classifyCron(cron: string | undefined): CronParts {
  const trimmed = cron?.trim() ?? ""

  if (trimmed === "") {
    return defaultParts
  }

  const custom: CronParts = { ...defaultParts, cron: trimmed, repeat: "custom" }
  const fields = trimmed.split(/\s+/)

  if (fields.length !== 5) {
    return custom
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields
  const time = readTime(minute, hour)

  if (time === null || month !== "*") {
    return custom
  }

  if (dayOfMonth === "*" && dayOfWeek === "*") {
    return { ...custom, repeat: "daily", time }
  }

  if (dayOfMonth === "*" && dayOfWeek === "1-5") {
    return { ...custom, repeat: "weekdays", time }
  }

  const weekday = readWeekday(dayOfWeek)

  if (dayOfMonth === "*" && weekday !== null) {
    return { ...custom, repeat: "weekly", time, weekday }
  }

  if (dayOfWeek === "*" && isMonthDay(dayOfMonth)) {
    return { ...custom, monthDay: dayOfMonth, repeat: "monthly", time }
  }

  return custom
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
    return { runAt: getNextCronRunAt(built.cron, now) }
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

function readTime(minute: string, hour: string) {
  if (!(isInteger(minute) && isInteger(hour))) {
    return null
  }

  const minuteValue = Number(minute)
  const hourValue = Number(hour)

  if (minuteValue > 59 || hourValue > 23) {
    return null
  }

  return `${pad(hourValue)}:${pad(minuteValue)}`
}

function parseTime(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time)

  if (match === null) {
    return null
  }

  return { hour: Number(match[1]), minute: Number(match[2]) }
}

function readWeekday(dayOfWeek: string) {
  if (!isInteger(dayOfWeek) || Number(dayOfWeek) > 7) {
    return null
  }

  return dayOfWeek === "7" ? "0" : dayOfWeek
}

function isMonthDay(dayOfMonth: string) {
  if (!isInteger(dayOfMonth)) {
    return false
  }

  const value = Number(dayOfMonth)

  return value >= 1 && value <= 31
}

function isInteger(value: string) {
  return /^\d{1,2}$/.test(value)
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function ordinal(value: number) {
  const remainder = value % 10
  const suffix =
    value >= 11 && value <= 13
      ? "th"
      : remainder === 1
        ? "st"
        : remainder === 2
          ? "nd"
          : remainder === 3
            ? "rd"
            : "th"

  return `${value}${suffix}`
}
