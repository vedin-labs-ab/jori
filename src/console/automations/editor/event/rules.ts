import {
  type AutomationEventDefinition,
  type AutomationEventMatch,
  assertAutomationEventIsAvailable,
  normalizeAutomationEventMatch,
} from "@contracts/automations/events"

export function readAutomationEventMatch(
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
