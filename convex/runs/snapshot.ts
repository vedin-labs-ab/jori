import { type Doc } from "../_generated/dataModel"

export type RunSnapshot = {
  title: string
  instructions?: string
}

export function createAutomationRunSnapshot(input: {
  instructions: string
  name: string
}): RunSnapshot {
  return {
    title: normalizeRunText(input.name) ?? "Automation run",
    ...optionalInstructions(input.instructions),
  }
}

export function createMessageRunSnapshot(input: {
  text: string | undefined
}): RunSnapshot {
  const instructions = normalizeRunText(input.text)

  return {
    title: firstLine(instructions) ?? "Message run",
    ...optionalInstructions(instructions),
  }
}

export function runSnapshotInstructions(run: Doc<"runs"> | null) {
  return normalizeRunText(run?.instructions)
}

export function runSnapshotTitle(run: Doc<"runs"> | null) {
  return normalizeRunText(run?.title)
}

export function firstLine(text: string | undefined) {
  const line = text?.trim().split("\n").find(Boolean)

  if (line === undefined) {
    return undefined
  }

  return line.length > 90 ? `${line.slice(0, 87)}...` : line
}

function optionalInstructions(text: string | undefined) {
  const instructions = normalizeRunText(text)

  return instructions === undefined ? {} : { instructions }
}

export function normalizeRunText(text: string | undefined) {
  const value = text?.trim()

  return value === "" ? undefined : value
}
