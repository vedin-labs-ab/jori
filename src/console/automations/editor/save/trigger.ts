import {
  type AutomationEventCriteria,
  getAutomationEventDefinition,
  getDefaultAutomationEvent,
  isAutomationEventIntegration,
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
  | { at: string }
  | { expression: string }
  | {
      integration: AutomationFormValues["eventIntegration"]
      event: string
      criteria?: AutomationEventCriteria
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

    return { type: "cron", trigger: { expression: built.cron } }
  }

  if (values.type === "event") {
    const definition = getAutomationEventDefinition(
      values.eventIntegration,
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
      type: "event",
      trigger: {
        integration: values.eventIntegration,
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
      built.cron !== existing.trigger.expression
    )
  }

  if (values.type === "event") {
    return (
      values.eventIntegration !== existingValues.eventIntegration ||
      values.event.trim() !== existingValues.event ||
      criteriaKey(values.eventCriteria) !==
        criteriaKey(existingValues.eventCriteria)
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
      runAt: "",
      eventIntegration: emptyAutomationForm.eventIntegration,
      event: emptyAutomationForm.event,
      eventCriteria: {},
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
      runAt: "",
      eventIntegration: integration,
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
    runAt: "at" in trigger ? toDatetimeLocal(trigger.at) : "",
    eventIntegration: emptyAutomationForm.eventIntegration,
    event: emptyAutomationForm.event,
    eventCriteria: {},
  }
}
