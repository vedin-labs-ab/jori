import {
  type AutomationEventCriteria,
  type AutomationEventDefinition,
  assertAutomationEventIsAvailable,
  normalizeAutomationEventCriteria,
} from "@contracts/automations/events"

export function readAutomationEventCriteria(
  definition: AutomationEventDefinition,
  value: Record<string, string>
): { value: AutomationEventCriteria | undefined } | { error: string } {
  try {
    assertAutomationEventIsAvailable(definition)
    return { value: normalizeAutomationEventCriteria(definition, value) }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid event criteria.",
    }
  }
}
