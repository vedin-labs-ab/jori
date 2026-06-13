export const automationInstructionMarkerErrors = {
  incompleteAccess: "Choose at least one tool for each mentioned integration.",
  noMarkers: "Mention at least one integration in the instructions.",
  noWrite: "Give at least one mentioned integration a write tool.",
  unavailableAccess:
    "Some selected integration tools are not available for automations.",
} as const

export type AutomationInstructionMarkerError =
  (typeof automationInstructionMarkerErrors)[keyof typeof automationInstructionMarkerErrors]

export function readAutomationInstructionMarkerError(
  error: string | undefined
): AutomationInstructionMarkerError | undefined {
  if (
    error === automationInstructionMarkerErrors.incompleteAccess ||
    error === automationInstructionMarkerErrors.noMarkers ||
    error === automationInstructionMarkerErrors.noWrite ||
    error === automationInstructionMarkerErrors.unavailableAccess
  ) {
    return error
  }

  return undefined
}
