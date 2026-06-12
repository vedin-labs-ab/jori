import {
  type AutomationEventDefinition,
  normalizeAutomationEventResource,
} from "../../../convex/automations/events"

export function readAutomationEventResource(
  definition: AutomationEventDefinition,
  value: string
): { value: string | undefined } | { error: string } {
  try {
    return { value: normalizeAutomationEventResource(definition, value) }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid event resource.",
    }
  }
}
