export const automationInstructionMarkerErrors = {
  incompleteAccess: "Choose read, write, or read/write for each mention.",
  noMarkers: "Mention at least one integration in the instructions.",
  noWrite: "Give at least one mentioned integration write access.",
  unavailableAccess:
    "Some mentioned integration access is not available for automations.",
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
