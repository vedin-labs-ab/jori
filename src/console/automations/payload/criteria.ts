import {
  type AutomationEventDefinition,
  legacyAutomationEventCriteria,
} from "../../../../convex/automations/events"
import { type Automation } from "../types"

export function eventCriteriaFormValues(
  definition: AutomationEventDefinition,
  trigger: Extract<Automation["trigger"], { type: "event" }>
) {
  const criteria =
    trigger.criteria ??
    legacyAutomationEventCriteria(definition, trigger.filter)

  return Object.fromEntries(
    Object.entries(criteria ?? {}).map(([key, value]) => [key, String(value)])
  )
}

export function criteriaKey(criteria: Record<string, string>) {
  return JSON.stringify(
    Object.entries(criteria)
      .filter(([, value]) => value.trim() !== "")
      .sort(([left], [right]) => left.localeCompare(right))
  )
}
