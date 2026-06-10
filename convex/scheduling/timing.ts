import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { getNextCronRunAt } from "./cron"

export const scheduleInput = v.union(
  v.object({
    type: v.literal("oneShot"),
    runAt: v.string(),
  }),
  v.object({
    type: v.literal("recurring"),
    cron: v.string(),
  })
)

export type ScheduleInput =
  | { type: "oneShot"; runAt: string }
  | { type: "recurring"; cron: string }

export function getScheduleTiming(schedule: ScheduleInput, now: number) {
  if (schedule.type === "oneShot") {
    const runAt = parseUtcIsoTimestamp(schedule.runAt)

    if (runAt <= now) {
      throw new Error("One-shot schedules must be in the future")
    }

    return {
      cron: undefined,
      runAt,
      nextRunAt: runAt,
    }
  }

  return {
    cron: schedule.cron.trim(),
    runAt: undefined,
    nextRunAt: getNextCronRunAt(schedule.cron, now),
  }
}

export function normalizeRequiredText(value: string, label: string) {
  const normalized = value.trim()

  if (normalized === "") {
    throw new Error(`Schedule ${label} is required`)
  }

  return normalized
}

export function requiredCron(schedule: Doc<"schedules">) {
  if (schedule.cron === undefined) {
    throw new Error("Recurring schedule is missing cron")
  }

  return schedule.cron
}

function parseUtcIsoTimestamp(value: string) {
  if (!value.endsWith("Z")) {
    throw new Error("One-shot schedules must use an ISO timestamp in UTC")
  }

  const timestamp = Date.parse(value)

  if (!Number.isFinite(timestamp)) {
    throw new Error("Invalid ISO timestamp")
  }

  return timestamp
}
