import { type Infer } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { automationDisplay, messageDisplay } from "./display"
import { type runSnapshot } from "./schema"

type RunSnapshot = Infer<typeof runSnapshot>

type RunSnapshotInput = {
  instructions?: string
  snapshot: RunSnapshot
}

export function createAutomationRunSnapshot(input: {
  automation: Doc<"automations">
  event?: Doc<"events"> | null
  integration?: Doc<"integrations"> | null
}): RunSnapshotInput {
  return {
    instructions: normalizeRequiredRunText(
      input.automation.instructions,
      "Run instructions"
    ),
    snapshot: {
      title: normalizeRequiredRunText(input.automation.name, "Run title"),
      ...automationDisplay(input),
    },
  }
}

export function createMessageRunSnapshot(input: {
  integration: Doc<"integrations">
  kind: "mention" | "reply"
  message: Doc<"messages">
}): RunSnapshotInput {
  const text = normalizeRequiredRunText(input.message.text ?? "", "Run title")

  return {
    snapshot: {
      title: firstLine(text),
      ...messageDisplay(input),
    },
  }
}

export function createInstructionRunSnapshot(input: {
  instructions: string
  parent?: Doc<"runs">
  title?: string
}): RunSnapshotInput {
  const instructions = normalizeRequiredRunText(
    input.instructions,
    "Run instructions"
  )

  return {
    instructions,
    snapshot: {
      ...(input.parent?.snapshot ?? manualSnapshot()),
      title: normalizeTitle(input.title, instructions),
      source: input.parent?.snapshot.source ?? {
        type: "manual",
      },
    },
  }
}

function firstLine(text: string) {
  const line = text.split("\n").find(Boolean)

  if (line === undefined) {
    throw new Error("Run title cannot be empty.")
  }

  return line.length > 90 ? `${line.slice(0, 87)}...` : line
}

function normalizeTitle(title: string | undefined, instructions: string) {
  const value = title?.trim() || firstLine(instructions)

  return value.length > 90 ? `${value.slice(0, 87)}...` : value
}

function manualSnapshot(): RunSnapshot {
  return {
    title: "Manual run",
    source: {
      type: "manual",
    },
    context: [],
  }
}

function normalizeRequiredRunText(text: string, label: string) {
  const value = text.trim()

  if (value === "") {
    throw new Error(`${label} cannot be empty.`)
  }

  return value
}
