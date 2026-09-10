import { expect, test } from "vitest"
import { type Id } from "../../_generated/dataModel"
import { type PendingSummary } from "./data"
import { conversationSummaryPrompt } from "./prompt"

const keepIdentifiers = "Keep the identifiers of the resources"

test("a console thread's summary keeps the identifiers of what it touched", () => {
  const prompt = conversationSummaryPrompt(pending("console"))

  expect(prompt).toContain(keepIdentifiers)
  expect(prompt).toContain(
    "Omit chatter, secrets, sensitive personal data,\ntimestamps, and process details"
  )
  expect(prompt).toContain("Prior summary:\n\nAlready underway.")
  expect(prompt).toContain(
    "1970-01-01T00:00:01.000Z | person | Albin\nRename it."
  )
})

test("a provider thread's summary drops identifiers as before", () => {
  const prompt = conversationSummaryPrompt(pending("slack"))

  expect(prompt).not.toContain(keepIdentifiers)
  expect(prompt).toContain(
    "Omit chatter, secrets, sensitive personal data, identifiers,\ntimestamps, and process details"
  )
})

function pending(surface: PendingSummary["surface"]): PendingSummary {
  return {
    functionId: "scheduled" as PendingSummary["functionId"],
    conversationId: "conversations:1" as Id<"conversations">,
    messages: [
      {
        actor: "Albin",
        createdAt: 1_000,
        observedAt: null,
        speaker: "person",
        text: "Rename it.",
      },
    ],
    priorSummary: "Already underway.",
    readAt: 2_000,
    surface,
  }
}
