import {
  type AutomationEventCriteria,
  getAutomationEventDefinition,
  getDefaultAutomationEvent,
  isAutomationEventProvider,
} from "@contracts/automations/events"
import { buildRecurringCron, classifyCron } from "../../cron"
import { toDatetimeLocal } from "../../format"
import {
  type Automation,
  type AutomationFormValues,
  emptyAutomationForm,
} from "../../types"
import { readAutomationEventCriteria } from "../event/rules"
import { criteriaKey, eventCriteriaFormValues } from "./criteria"

export type TriggerSpec =
  | { type: "once"; at: string }
  | { type: "cron"; cron: string }
  | {
      type: "event"
      provider: AutomationFormValues["eventProvider"]
      event: string
      criteria?: AutomationEventCriteria
    }

export function buildAutomationTriggerSpec(
  values: AutomationFormValues
): { trigger: TriggerSpec } | { error: string } {
  if (values.type === "cron") {
    const built = buildRecurringCron(values)

    if ("error" in built) {
      return built
    }

    return { trigger: { type: "cron", cron: built.cron } }
  }

  if (values.type === "event") {
    const definition = getAutomationEventDefinition(
      values.eventProvider,
      values.event
    )

    if (definition === undefined) {
      return { error: "Choose a supported automation event." }
    }

    const criteria = readAutomationEventCriteria(
      definition,
      values.eventCriteria
    )

    if ("error" in criteria) {
      return criteria
    }

    return {
      trigger: {
        type: "event",
        provider: values.eventProvider,
        event: definition.value,
        criteria: criteria.value,
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

  return { trigger: { type: "once", at: runAt.toISOString() } }
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
      existing.trigger.type !== "cron" ||
      "error" in built ||
      built.cron !== existing.trigger.cron
    )
  }

  if (values.type === "event") {
    return (
      values.eventProvider !== existingValues.eventProvider ||
      values.event.trim() !== existingValues.event ||
      criteriaKey(values.eventCriteria) !==
        criteriaKey(existingValues.eventCriteria)
    )
  }

  return values.runAt !== existingValues.runAt
}

export function triggerFormValues(automation: Automation) {
  const trigger = automation.trigger

  if (trigger.type === "cron") {
    return {
      type: "cron" as const,
      ...classifyCron(trigger.cron),
      runAt: "",
      eventProvider: emptyAutomationForm.eventProvider,
      event: emptyAutomationForm.event,
      eventCriteria: {},
    }
  }

  if (trigger.type === "event") {
    const provider = isAutomationEventProvider(trigger.provider)
      ? trigger.provider
      : emptyAutomationForm.eventProvider
    const definition =
      getAutomationEventDefinition(provider, trigger.event) ??
      getDefaultAutomationEvent(provider)

    return {
      type: "event" as const,
      ...classifyCron(undefined),
      runAt: "",
      eventProvider: provider,
      event: definition.value,
      eventCriteria:
        definition.value === trigger.event
          ? eventCriteriaFormValues(definition, trigger)
          : {},
    }
  }

  return {
    type: "once" as const,
    ...classifyCron(undefined),
    runAt: toDatetimeLocal(trigger.at),
    eventProvider: emptyAutomationForm.eventProvider,
    event: emptyAutomationForm.event,
    eventCriteria: {},
  }
}
