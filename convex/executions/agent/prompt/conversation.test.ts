import { expect, test } from "vitest"
import { assemblePrompt } from "."
import { runtimeInput } from "./fixtures"

test("renders recent conversation context without duplicating the trigger", () => {
  const input = runtimeInput("slack", { channelId: "C123", ts: "123.456" })

  if (input.type !== "message") {
    throw new Error("Expected message input.")
  }

  input.conversation = [
    {
      actor: "Albin",
      createdAt: 1_000,
      id: "previous-user-message",
      observedAt: null,
      source: "user",
      text: "Can you check this?",
      type: "message",
    },
    {
      actor: "Milo",
      createdAt: 2_000,
      id: "previous-quick-reply",
      observedAt: null,
      source: "self",
      text: "I can take a quick look.",
      type: "milo.reply",
    },
    {
      actor: "CI",
      createdAt: 3_000,
      id: "previous-bot-message",
      observedAt: null,
      source: "bot",
      text: "Build failed.",
      type: "message",
    },
    {
      actor: "Albin",
      createdAt: 4_000,
      id: "message",
      observedAt: null,
      source: "user",
      text: "Duplicate trigger context.",
      type: "message",
    },
  ]

  const prompt = assemblePrompt(input)

  expect(prompt).toContain(
    "source=user | authority=authoritative | type=message | actor=Albin"
  )
  expect(prompt).toContain(
    "source=self | authority=soft | type=milo.reply | actor=Milo"
  )
  expect(prompt).toContain(
    "source=bot | authority=soft | type=message | actor=CI"
  )
  expect(prompt).toContain("I can take a quick look.")
  expect(prompt).not.toContain("Duplicate trigger context.")
})
