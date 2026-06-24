import { expect, test } from "vitest"
import { assemblePrompt } from "."
import { runtimeInput } from "./fixtures"

type MessageInput = Extract<
  Parameters<typeof assemblePrompt>[0],
  {
    type: "message"
  }
>
type ConversationEntry = MessageInput["conversation"][number]

test("renders recent conversation context without duplicating the trigger", () => {
  const prompt = assemblePrompt(messageInputWithConversation())

  expect(prompt).toContain("Recent messages:")
  expect(prompt).not.toContain("Recent conversation:")
  expect(prompt).toContain(
    "- 1970-01-01T00:00:01.000Z | user | Albin | message_ids=[slack:message:123.456] | actor_ids=[slack:user:U123]"
  )
  expect(prompt).toContain("- 1970-01-01T00:00:02.000Z | self | Milo")
  expect(prompt).toContain("- 1970-01-01T00:00:03.000Z | bot | CI")
  expect(prompt).toContain("- 1970-01-01T00:00:03.500Z | bot | unknown")
  expect(prompt).not.toContain("message_ids=[]")
  expect(prompt).not.toContain("actor_ids=[]")
  expect(prompt).not.toContain("source=")
  expect(prompt).not.toContain("authority=")
  expect(prompt).not.toContain("type=event")
  expect(prompt).toContain("I can take a quick look.")
  expect(prompt).not.toContain("Duplicate trigger context.")
  expect(prompt).toContain("Current message:")
})

test("keeps explicit empty recent messages context", () => {
  const prompt = assemblePrompt(
    runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" })
  )

  expect(prompt).toContain("Recent messages:\n\n- None")
})

function messageInputWithConversation() {
  const input = runtimeInput("slack", {
    channel: { id: "C123" },
    ts: "123.456",
  })

  if (input.type !== "message") {
    throw new Error("Expected message input.")
  }

  input.conversation = recentConversation()

  return input
}

function recentConversation(): ConversationEntry[] {
  return [
    {
      actor: "Albin",
      actorIds: ["slack:user:U123"],
      createdAt: 1_000,
      id: "previous-user-message",
      messageIds: ["slack:message:123.456"],
      observedAt: null,
      source: "user",
      text: "Can you check this?",
      type: "message",
    },
    {
      actor: "Milo",
      actorIds: [],
      createdAt: 2_000,
      id: "previous-quick-reply",
      messageIds: [],
      observedAt: null,
      source: "self",
      text: "I can take a quick look.",
      type: "milo.reply",
    },
    {
      actor: "CI",
      actorIds: [],
      createdAt: 3_000,
      id: "previous-bot-message",
      messageIds: [],
      observedAt: null,
      source: "bot",
      text: "Build failed.",
      type: "message",
    },
    {
      actor: null,
      actorIds: [],
      createdAt: 3_500,
      id: "previous-system-message",
      messageIds: [],
      observedAt: null,
      source: "bot",
      text: "Deployment started.",
      type: "event",
    },
    {
      actor: "Albin",
      actorIds: [],
      createdAt: 4_000,
      id: "message",
      messageIds: [],
      observedAt: null,
      source: "user",
      text: "Duplicate trigger context.",
      type: "message",
    },
  ]
}
