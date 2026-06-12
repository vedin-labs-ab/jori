export const automationInstructionMarkerErrors = {
  incompleteAccess: "Choose read, write, or read/write for each mention.",
  noMarkers: "Mention at least one integration in the instructions.",
  noWrite: "Give at least one mentioned integration write access.",
} as const

export type AutomationInstructionMarkerError =
  (typeof automationInstructionMarkerErrors)[keyof typeof automationInstructionMarkerErrors]

export function readAutomationInstructionMarkerError(
  error: string | undefined
): AutomationInstructionMarkerError | undefined {
  if (
    error === automationInstructionMarkerErrors.incompleteAccess ||
    error === automationInstructionMarkerErrors.noMarkers ||
    error === automationInstructionMarkerErrors.noWrite
  ) {
    return error
  }

  return undefined
}
