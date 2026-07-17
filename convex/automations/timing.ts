import { automationEventMatchKey } from "../../contracts/automations/events"
import { getNextCronRunAt } from "../../contracts/automations/schedule/cron"
import { type Doc } from "../_generated/dataModel"

export type TimeTriggerInput =
  | { type: "once"; at: string }
  | { type: "cron"; expression: string; timezone: string }

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
    timezone: input.timezone,
    nextAt: getNextCronRunAt(expression, now, input.timezone),
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

export function isSameEventTrigger(
  left: Doc<"automations">["trigger"],
  right: Doc<"automations">["trigger"] | undefined
) {
  return (
    "integrationId" in left &&
    right !== undefined &&
    "integrationId" in right &&
    left.integrationId === right.integrationId &&
    left.event === right.event &&
    automationEventMatchKey(left.match) === automationEventMatchKey(right.match)
  )
}

export function sameTriggerDefinition(
  left: Doc<"automations">["trigger"],
  right: Doc<"automations">["trigger"]
) {
  if ("at" in left || "at" in right) {
    return "at" in left && "at" in right && left.at === right.at
  }

  if ("expression" in left || "expression" in right) {
    return (
      "expression" in left &&
      "expression" in right &&
      left.expression === right.expression &&
      left.timezone === right.timezone
    )
  }

  return isSameEventTrigger(left, right)
}
