import { type Doc } from "../../_generated/dataModel"
import { getNextCronRunAt } from "./cron"

export type TimeTriggerInput =
  | { type: "once"; at: string }
  | { type: "cron"; expression: string }

export type TimeTrigger =
  | Extract<Doc<"automations">["trigger"], { at: number }>
  | Extract<Doc<"automations">["trigger"], { nextAt: number }>

export function getTimeTrigger(input: TimeTriggerInput, now: number) {
  if (input.type === "once") {
    const at = parseUtcIsoTimestamp(input.at)

    if (at <= now) {
      throw new Error("One-time automations must run in the future.")
    }

    return {
      at,
    }
  }

  const expression = input.expression.trim()

  return {
    expression,
    nextAt: getNextCronRunAt(expression, now),
  }
}

export function getTimeTriggerAt(trigger: TimeTrigger) {
  return "at" in trigger ? trigger.at : trigger.nextAt
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
