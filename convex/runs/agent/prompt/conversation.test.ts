import { expect, test } from "vitest"
import { runtimeInput } from "../../../../test/convex/prompt"
import { assemblePrompt } from "."

type MessageInput = Extract<
  Parameters<typeof assemblePrompt>[0],
  {
    type: "message"
  }
>
type ConversationEntry = MessageInput["conversation"]["entries"][number]

test("renders recent conversation context without duplicating the trigger", () => {
  const prompt = assemblePrompt(messageInputWithConversation()).context

  expect(prompt).toContain("Recent messages:")
  expect(prompt).not.toContain("Recent conversation:")
  expect(prompt).toContain(
    "- 1970-01-01T00:00:01.000Z | person | Albin | identifiers=[internal:message:previous-user-message, slack:message:123.456] | actor_ids=[slack:user:U123]"
  )
  expect(prompt).toContain("reactions=[👍 x2 (Nina, Omar)]")
  expect(prompt).toContain("- 1970-01-01T00:00:02.000Z | self | Jori")
  expect(prompt).toContain("- 1970-01-01T00:00:03.000Z | bot | CI")
  expect(prompt).toContain("- 1970-01-01T00:00:03.500Z | bot | unknown")
  expect(prompt).not.toContain("identifiers=[]")
  expect(prompt).not.toContain("actor_ids=[]")
  expect(prompt).not.toContain("source=")
  expect(prompt).not.toContain("authority=")
  expect(prompt).not.toContain("type=event")
  expect(prompt).toContain("I can take a quick look.")
  expect(prompt).not.toContain("Duplicate trigger context.")
  expect(prompt).toContain("Current message:")
})

test("a console message's context reads as its own line, on the current message too", () => {
  const input = runtimeInput("slack", {
    channel: { id: "C123" },
    ts: "123.456",
  })

  if (input.type !== "message") {
    throw new Error("Expected message input.")
  }

  input.conversation = {
    entries: [
      entry({
        context:
          "Opened about table «Renewals» (tableId: collections:renewals)",
        createdAt: 1_000,
        id: "opening",
        text: "Which renewals are at risk?",
      }),
      entry({
        context: "Opened about folder «Finance» (folderId: folders:finance)",
        createdAt: 4_000,
        id: "message",
        text: "Not the trigger's own text.",
      }),
    ],
    hasMoreMessages: false,
    summary: null,
  }

  const prompt = assemblePrompt(input).context

  expect(prompt).toContain(
    "- 1970-01-01T00:00:01.000Z | person | Albin\nOpened about table «Renewals» (tableId: collections:renewals)\n```text\nWhich renewals are at risk?"
  )
  // The current message keeps the trigger's own text and borrows only the
  // line the history's read of the database could add.
  expect(prompt).toContain(
    "Opened about folder «Finance» (folderId: folders:finance)\n```text\nPlease help."
  )
  expect(prompt).not.toContain("Not the trigger's own text.")
})

test("renders an omitted history note when recent context is truncated", () => {
  const prompt = assemblePrompt(messageInputWithTruncatedConversation()).context

  expect(prompt).toContain("Recent messages (older messages omitted):")
  expect(prompt).toContain("Previous message 1")
  expect(prompt).toContain("Previous message 15")
  expect(prompt).not.toContain("Current trigger.")
  expect(prompt).not.toContain("Earlier in this conversation")
})

test("the conversation's summary stands in for the messages the window omitted", () => {
  const input = messageInputWithTruncatedConversation()

  input.conversation.summary =
    "Albin asked for the renewals table (collections:renewals) to be cleaned up."

  const prompt = assemblePrompt(input).context
  const earlier = prompt.indexOf("Earlier in this conversation: Albin asked")
  const recent = prompt.indexOf("Recent messages (older messages omitted):")

  expect(earlier).toBeGreaterThan(-1)
  expect(earlier).toBeLessThan(recent)
})

test("a summary is left out while the recent window still holds everything", () => {
  const input = messageInputWithConversation()

  input.conversation.summary = "Stale summary of a short thread."

  const prompt = assemblePrompt(input).context

  expect(prompt).not.toContain("Earlier in this conversation")
  expect(prompt).not.toContain("Stale summary")
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
    summary: null,
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
        identifiers: [
          "internal:message:previous-user-message",
          "slack:message:123.456",
        ],
        reactions: "👍 x2 (Nina, Omar)",
        text: "Can you check this?",
      }),
      entry({
        actor: "Jori",
        createdAt: 2_000,
        id: "previous-quick-reply",
        source: "self",
        text: "I can take a quick look.",
        type: "jori.reply",
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
    summary: null,
  }
}

function entry(
  args: Partial<ConversationEntry> & Pick<ConversationEntry, "id" | "text">
): ConversationEntry {
  return {
    actor: "Albin",
    actorIds: [],
    context: null,
    createdAt: 0,
    identifiers: [],
    observedAt: null,
    reactions: null,
    source: "person",
    type: "message",
    ...args,
  }
}
