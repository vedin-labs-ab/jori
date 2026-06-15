import { type Infer } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { automationDisplay, messageDisplay } from "./display"
import { type runDisplay } from "./schema"

type RunDisplay = Infer<typeof runDisplay>

type RunSnapshot = {
  display: RunDisplay
  task: string
  title: string
}

export function createAutomationRunSnapshot(input: {
  automation: Doc<"automations">
  event?: Doc<"events"> | null
  integration?: Doc<"integrations"> | null
}): RunSnapshot {
  return {
    title: normalizeRequiredRunText(input.automation.name, "Run title"),
    task: normalizeRequiredRunText(input.automation.instructions, "Run task"),
    display: automationDisplay(input),
  }
}

export function createMessageRunSnapshot(input: {
  integration: Doc<"integrations">
  kind: "mention" | "reply"
  message: Doc<"messages">
}): RunSnapshot {
  const task = normalizeRequiredRunText(input.message.text ?? "", "Run task")

  return {
    title: firstLine(task),
    task,
    display: messageDisplay(input),
  }
}

function firstLine(text: string) {
  const line = text.split("\n").find(Boolean)

  if (line === undefined) {
    throw new Error("Run title cannot be empty.")
  }

  return line.length > 90 ? `${line.slice(0, 87)}...` : line
}

function normalizeRequiredRunText(text: string, label: string) {
  const value = text.trim()

  if (value === "") {
    throw new Error(`${label} cannot be empty.`)
  }

  return value
}
