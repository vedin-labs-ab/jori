import { type Doc } from "../_generated/dataModel"
import { getNextCronRunAt } from "./cron"

export type TimeTriggerInput =
  | { type: "once"; at: string }
  | { type: "cron"; cron: string }

export type TimeTrigger = Extract<
  Doc<"automations">["trigger"],
  { type: "once" | "cron" }
>

export function getTimeTrigger(input: TimeTriggerInput, now: number) {
  if (input.type === "once") {
    const at = parseUtcIsoTimestamp(input.at)

    if (at <= now) {
      throw new Error("One-time automations must run in the future.")
    }

    return {
      type: "once" as const,
      at,
    }
  }

  const cron = input.cron.trim()

  return {
    type: "cron" as const,
    cron,
    nextAt: getNextCronRunAt(cron, now),
  }
}

export function getTimeTriggerAt(trigger: TimeTrigger) {
  return trigger.type === "once" ? trigger.at : trigger.nextAt
}

export function normalizeRequiredText(value: string, label: string) {
  const normalized = value.trim()

  if (normalized === "") {
    throw new Error(`Automation ${label} is required.`)
  }

  return normalized
}

function parseUtcIsoTimestamp(value: string) {
  if (!value.endsWith("Z")) {
    throw new Error("One-time automations need an ISO timestamp in UTC.")
  }

  const timestamp = Date.parse(value)

  if (!Number.isFinite(timestamp)) {
    throw new Error("Invalid ISO timestamp.")
  }

  return timestamp
}
