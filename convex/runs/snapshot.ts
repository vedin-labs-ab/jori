import { type Infer } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { type Access } from "../shared/integrations"
import { automationDisplay, messageDisplay } from "./display"
import { type MessageCauseKind, type runSnapshot } from "./schema"

type RunSnapshot = Infer<typeof runSnapshot>

type RunSnapshotInput = {
  access?: Access
  instructions?: string
  snapshot: RunSnapshot
}

export function createAutomationRunSnapshot(input: {
  automation: Doc<"automations">
  event?: Doc<"events"> | null
  integration?: Doc<"integrations"> | null
}): RunSnapshotInput {
  return {
    access: input.automation.access,
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
  kind: MessageCauseKind
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

/**
 * Instruction runs describe only themselves: a subtask must not claim its
 * parent's source or context. The console derives the parent relationship
 * from `parentId` at read time.
 */
export function createInstructionRunSnapshot(input: {
  instructions: string
  title?: string
}): RunSnapshotInput {
  const instructions = normalizeRequiredRunText(
    input.instructions,
    "Run instructions"
  )

  return {
    instructions,
    snapshot: {
      title: normalizeTitle(input.title, instructions),
      source: {
        type: "manual",
      },
      context: [],
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

function normalizeRequiredRunText(text: string, label: string) {
  const value = text.trim()

  if (value === "") {
    throw new Error(`${label} cannot be empty.`)
  }

  return value
}
