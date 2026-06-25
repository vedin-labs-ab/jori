import { expect, test } from "vitest"
import { assemblePrompt } from "."
import { runtimeInput } from "./fixtures"

type MessageInput = Extract<
  Parameters<typeof assemblePrompt>[0],
  {
    type: "message"
  }
>
type ConversationEntry = MessageInput["conversation"]["entries"][number]

test("renders recent conversation context without duplicating the trigger", () => {
  const prompt = assemblePrompt(messageInputWithConversation())

  expect(prompt).toContain("Recent messages:")
  expect(prompt).not.toContain("Recent conversation:")
  expect(prompt).toContain(
    "- 1970-01-01T00:00:01.000Z | user | Albin | message_ids=[internal:message:previous-user-message, slack:message:123.456] | actor_ids=[slack:user:U123]"
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

test("renders an omitted history note when recent context is truncated", () => {
  const prompt = assemblePrompt(messageInputWithTruncatedConversation())

  expect(prompt).toContain("Recent messages (older messages omitted):")
  expect(prompt).toContain("Previous message 1")
  expect(prompt).toContain("Previous message 15")
  expect(prompt).not.toContain("Current trigger.")
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

function messageInputWithTruncatedConversation() {
  const input = runtimeInput("slack", {
    channel: { id: "C123" },
    ts: "123.456",
  })

  if (input.type !== "message") {
    throw new Error("Expected message input.")
  }

  input.conversation = {
    entries: [
      ...Array.from({ length: 15 }, (_, index) =>
        entry({
          createdAt: index + 1,
          id: `previous-${index + 1}`,
          text: `Previous message ${index + 1}`,
        })
      ),
      entry({
        createdAt: 20,
        id: "message",
        text: "Current trigger.",
      }),
    ],
    hasMoreMessages: true,
  }

  return input
}

function recentConversation() {
  return {
    entries: [
      entry({
        actor: "Albin",
        actorIds: ["slack:user:U123"],
        createdAt: 1_000,
        id: "previous-user-message",
        messageIds: [
          "internal:message:previous-user-message",
          "slack:message:123.456",
        ],
        text: "Can you check this?",
      }),
      entry({
        actor: "Milo",
        createdAt: 2_000,
        id: "previous-quick-reply",
        source: "self",
        text: "I can take a quick look.",
        type: "milo.reply",
      }),
      entry({
        actor: "CI",
        createdAt: 3_000,
        id: "previous-bot-message",
        source: "bot",
        text: "Build failed.",
      }),
      entry({
        actor: null,
        createdAt: 3_500,
        id: "previous-system-message",
        source: "bot",
        text: "Deployment started.",
        type: "event",
      }),
      entry({
        actor: "Albin",
        createdAt: 4_000,
        id: "message",
        text: "Duplicate trigger context.",
      }),
    ],
    hasMoreMessages: false,
  }
}

function entry(
  args: Partial<ConversationEntry> & Pick<ConversationEntry, "id" | "text">
): ConversationEntry {
  return {
    actor: "Albin",
    actorIds: [],
    createdAt: 0,
    messageIds: [],
    observedAt: null,
    source: "user",
    type: "message",
    ...args,
  }
}
