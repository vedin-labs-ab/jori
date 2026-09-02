import { jobScopeConflictMessage } from "@/shared/console/jobs/access"
import { readJobInstructionMarkerError } from "./save/marker"

export const jobNameErrors = {
  required: "Name is required.",
} as const

export const jobInstructionsErrors = {
  required: "Instructions are required.",
} as const

export function readJobNameError(
  error: string | undefined,
  name: string
): string | undefined {
  if (!isJobNameError(error) || name.trim() !== "") {
    return undefined
  }

  return error
}

function isJobNameError(error: string | undefined) {
  return error === jobNameErrors.required
}

export function readJobInstructionsError(
  error: string | undefined,
  instructions: string
): string | undefined {
  const markerError = readJobInstructionMarkerError(error)

  if (markerError !== undefined) {
    return markerError
  }

  if (isJobToolReferenceError(error)) {
    return error
  }

  if (error === jobScopeConflictMessage) {
    return error
  }

  if (!isJobInstructionsError(error) || instructions.trim() !== "") {
    return undefined
  }

  return error
}

function isJobInstructionsError(error: string | undefined) {
  return (
    error === jobInstructionsErrors.required ||
    readJobInstructionMarkerError(error) !== undefined ||
    isJobToolReferenceError(error) ||
    error === jobScopeConflictMessage
  )
}

export function isJobFieldError(error: string | undefined) {
  return isJobNameError(error) || isJobInstructionsError(error)
}

export function isJobToolReferenceError(error: string | undefined) {
  return (
    error?.startsWith("Give @") === true ||
    error?.startsWith("Enable web access to use #") === true ||
    error?.endsWith("requires Personal sharing.") === true ||
    (error?.startsWith("#") === true &&
      error.endsWith("is not available in jobs."))
  )
}
