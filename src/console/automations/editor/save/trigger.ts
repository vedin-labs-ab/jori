import {
  type AutomationEventDefinition,
  type AutomationEventMatch,
  assertAutomationEventIsAvailable,
  getAutomationEventDefinition,
  getDefaultAutomationEvent,
  isAutomationEventIntegration,
  normalizeAutomationEventMatch,
} from "@contracts/automations/events"
import { buildRecurringCron, classifyCron } from "../../cron"
import {
  type Automation,
  type AutomationFormValues,
  emptyAutomationForm,
} from "../../types"

export type TriggerSpec =
  | { at: string }
  | { expression: string; timezone: string }
  | {
      integration: AutomationFormValues["eventIntegration"]
      event: string
      match?: AutomationEventMatch
    }

export function buildAutomationTriggerSpec(
  values: AutomationFormValues
):
  | { type: AutomationFormValues["type"]; trigger: TriggerSpec }
  | { error: string } {
  if (values.type === "cron") {
    const built = buildRecurringCron(values)

    if ("error" in built) {
      return built
    }

    return {
      type: "cron",
      trigger: { expression: built.cron, timezone: values.timezone },
    }
  }

  if (values.type === "event") {
    const definition = getAutomationEventDefinition(
      values.eventIntegration,
      values.event
    )

    if (definition === undefined) {
      return { error: "Choose a supported automation event." }
    }

    const match = readAutomationEventMatch(definition, values.eventMatch)

    if ("error" in match) {
      return match
    }

    return {
      type: "event",
      trigger: {
        integration: values.eventIntegration,
        event: definition.value,
        match: match.value,
      },
    }
  }

  if (values.runAt === "") {
    return { error: "Run time is required." }
  }

  const runAt = new Date(values.runAt)

  if (Number.isNaN(runAt.getTime())) {
    return { error: "Run time is not a valid date." }
  }

  if (runAt.getTime() <= Date.now()) {
    return { error: "Run time must be in the future." }
  }

  return { type: "once", trigger: { at: runAt.toISOString() } }
}

export function hasAutomationTriggerChanged(
  values: AutomationFormValues,
  existing: Automation,
  existingValues: AutomationFormValues
) {
  if (values.type !== existingValues.type) {
    return true
  }

  if (values.type === "cron") {
    const built = buildRecurringCron(values)

    return (
      existing.type !== "cron" ||
      !("expression" in existing.trigger) ||
      "error" in built ||
      built.cron !== existing.trigger.expression ||
      values.timezone !== existing.trigger.timezone
    )
  }

  if (values.type === "event") {
    return (
      values.eventIntegration !== existingValues.eventIntegration ||
      values.event.trim() !== existingValues.event ||
      matchKey(values.eventMatch) !== matchKey(existingValues.eventMatch)
    )
  }

  return values.runAt !== existingValues.runAt
}

export function triggerFormValues(automation: Automation) {
  const trigger = automation.trigger

  if (automation.type === "cron" && "expression" in trigger) {
    return {
      type: "cron" as const,
      ...classifyCron(trigger.expression),
      timezone: trigger.timezone,
      runAt: "",
      eventIntegration: emptyAutomationForm.eventIntegration,
      event: emptyAutomationForm.event,
      eventMatch: {},
    }
  }

  if (automation.type === "event" && "event" in trigger) {
    const triggerIntegration =
      "integration" in trigger ? trigger.integration : undefined
    const integration = isAutomationEventIntegration(triggerIntegration)
      ? triggerIntegration
      : emptyAutomationForm.eventIntegration
    const definition =
      getAutomationEventDefinition(integration, trigger.event) ??
      getDefaultAutomationEvent(integration)

    return {
      type: "event" as const,
      ...classifyCron(undefined),
      timezone: emptyAutomationForm.timezone,
      runAt: "",
      eventIntegration: integration,
      event: definition.value,
      eventMatch:
        definition.value === trigger.event ? eventMatchFormValues(trigger) : {},
    }
  }

  return {
    type: "once" as const,
    ...classifyCron(undefined),
    timezone: emptyAutomationForm.timezone,
    runAt: "at" in trigger ? toDatetimeLocal(trigger.at) : "",
    eventIntegration: emptyAutomationForm.eventIntegration,
    event: emptyAutomationForm.event,
    eventMatch: {},
  }
}

function readAutomationEventMatch(
  definition: AutomationEventDefinition,
  value: Record<string, string>
): { value: AutomationEventMatch | undefined } | { error: string } {
  try {
    assertAutomationEventIsAvailable(definition)
    return { value: normalizeAutomationEventMatch(definition, value) }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid event match.",
    }
  }
}

function eventMatchFormValues(
  trigger: Extract<Automation["trigger"], { event: string }>
) {
  return Object.fromEntries(
    Object.entries(trigger.match ?? {}).map(([key, value]) => [
      key,
      String(value),
    ])
  )
}

function matchKey(match: Record<string, string>) {
  return JSON.stringify(
    Object.entries(match)
      .filter(([, value]) => value.trim() !== "")
      .sort(([left], [right]) => left.localeCompare(right))
  )
}

function toDatetimeLocal(timestamp: number) {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, "0")
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
