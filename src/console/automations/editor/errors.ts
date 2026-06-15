import { readAutomationInstructionMarkerError } from "./save/marker"

const automationNameErrors = {
  required: "Name is required.",
} as const

const automationInstructionsErrors = {
  required: "Instructions are required.",
} as const

export function readAutomationNameError(
  error: string | undefined,
  name: string
): string | undefined {
  if (!isAutomationNameError(error) || name.trim() !== "") {
    return undefined
  }

  return error
}

export function isAutomationNameError(error: string | undefined) {
  return error === automationNameErrors.required
}

export function readAutomationInstructionsError(
  error: string | undefined,
  instructions: string
): string | undefined {
  const markerError = readAutomationInstructionMarkerError(error)

  if (markerError !== undefined) {
    return markerError
  }

  if (!isAutomationInstructionsError(error) || instructions.trim() !== "") {
    return undefined
  }

  return error
}

export function isAutomationInstructionsError(error: string | undefined) {
  return (
    error === automationInstructionsErrors.required ||
    readAutomationInstructionMarkerError(error) !== undefined
  )
}
