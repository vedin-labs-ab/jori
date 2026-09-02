export const jobInstructionMarkerErrors = {
  incompleteAccess: "Choose at least one tool for each mentioned integration.",
  noMarkers: "Mention at least one integration in the instructions.",
  noWrite: "Give at least one mentioned integration a write tool.",
  unavailableAccess:
    "Some selected integration tools are not available for jobs.",
} as const

type JobInstructionMarkerError =
  (typeof jobInstructionMarkerErrors)[keyof typeof jobInstructionMarkerErrors]

export function readJobInstructionMarkerError(
  error: string | undefined
): JobInstructionMarkerError | undefined {
  if (
    error === jobInstructionMarkerErrors.incompleteAccess ||
    error === jobInstructionMarkerErrors.noMarkers ||
    error === jobInstructionMarkerErrors.noWrite ||
    error === jobInstructionMarkerErrors.unavailableAccess
  ) {
    return error
  }

  return undefined
}
