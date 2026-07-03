import { expect, test, vi } from "vitest"
import { type ToolRuntime } from "../tool"
import {
  type ConvexId,
  type RuntimeInteraction,
  type RuntimeMessage,
} from "../types"
import {
  appendSessionMessages,
  formatSessionInteraction,
  formatSessionMessage,
  promptMessages,
  replacePromptMessages,
} from "./messages"

test("formats drained messages like conversation messages", () => {
  const formatted = formatSessionMessage(runtimeMessage())

  expect(
    formatted
  ).toBe(`- 2026-06-22T09:34:35.618Z | self | Milo | identifiers=[internal:message:message, slack:message:1782231485.491049] | actor_ids=[slack:user:U0B96KZ7WJG]
\`\`\`text
Here's what I've got.
\`\`\``)
  expect(formatted).not.toContain("New slack message")
  expect(formatted).not.toContain("Authority:")
  expect(formatted).not.toContain("Mentioned Milo:")
  expect(formatted).not.toContain("Message:")
})

test("formats drained reaction interactions compactly", () => {
  const formatted = formatSessionInteraction(runtimeInteraction())

  expect(
    formatted
  ).toBe(`- 2026-06-22T09:35:00.000Z | reaction.added | person | Albin | reaction=✅ | identifiers=[linear:issue:ISS-1, linear:comment:comment] | actor_ids=[linear:user:user]
\`\`\`text
Reacted ✅ to Milo's message: "I can proceed with option B."
\`\`\``)
})

test("updates the active surface target from drained messages", async () => {
  const runtime = {
    convex: {
      drainSessionMessages: vi.fn(async () => ({
        hasMore: false,
        messages: [
          runtimeMessage({
            integration: "linear",
            replyTarget: "linear:thread:comment-id",
          }),
        ],
      })),
    },
    context: {
      activeSurface: {
        communicated: false,
        surface: "linear",
        target: "linear:issue:issue-id",
      },
      session: { id: id<"sessions">("session") },
    },
  } as unknown as ToolRuntime
  const messages: Array<{ content: string; role: "user" }> = []

  await expect(appendSessionMessages(runtime, messages)).resolves.toBe(true)
  expect(runtime.context.activeSurface?.target).toBe("linear:thread:comment-id")
})

test("appends person context before drained batch items", async () => {
  const runtime = {
    convex: {
      drainSessionMessages: vi.fn(async () => ({
        contexts: ["# Recent activity — Albin"],
        hasMore: false,
        messages: [runtimeMessage({ source: "person" })],
      })),
    },
    context: {
      activeSurface: null,
      session: { id: id<"sessions">("session") },
    },
  } as unknown as ToolRuntime
  const messages: Array<{ content: string; role: "user" }> = []

  await expect(appendSessionMessages(runtime, messages)).resolves.toBe(true)
  expect(messages[0]).toEqual({
    content: "# Recent activity — Albin",
    role: "user",
  })
  expect(messages).toHaveLength(2)
})

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}

function runtimeMessage(
  overrides: Partial<RuntimeMessage> = {}
): RuntimeMessage {
  return {
    actor: "Milo",
    actorIds: ["slack:user:U0B96KZ7WJG"],
    authority: "soft",
    createdAt: Date.parse("2026-06-22T09:34:35.000Z"),
    id: id<"messages">("message"),
    identifiers: [
      "internal:message:message",
      "slack:message:1782231485.491049",
    ],
    integration: "slack",
    mentioned: false,
    observedAt: Date.parse("2026-06-22T09:34:35.618Z"),
    reactions: null,
    replyTarget: null,
    source: "self",
    text: "Here's what I've got.",
    type: "message.channels",
    ...overrides,
  }
}

function runtimeInteraction(
  overrides: Partial<RuntimeInteraction> = {}
): RuntimeInteraction {
  return {
    actor: "Albin",
    actorIds: ["linear:user:user"],
    createdAt: Date.parse("2026-06-22T09:35:00.000Z"),
    id: id<"reactions">("reaction"),
    identifiers: ["linear:issue:ISS-1", "linear:comment:comment"],
    observedAt: Date.parse("2026-06-22T09:35:00.000Z"),
    preview: "I can proceed with option B.",
    reaction: "✅",
    source: "person",
    target: "Milo",
    type: "reaction.added",
    ...overrides,
  }
}

const promptWithOrganization = {
  context: "context",
  instructions: "instructions",
  organization: "organization",
}
const promptWithoutOrganization = {
  context: "context",
  instructions: "instructions",
  organization: null,
}

test("builds the prompt prefix with and without an organization message", () => {
  expect(promptMessages(promptWithoutOrganization)).toEqual([
    { content: "instructions", role: "system" },
    { content: "context", role: "user" },
  ])
  expect(promptMessages(promptWithOrganization)).toEqual([
    { content: "instructions", role: "system" },
    { content: "organization", role: "user" },
    { content: "context", role: "user" },
  ])
})

test("replaces the prompt prefix in place across all shapes", () => {
  const history = { content: "history", role: "user" as const }
  const next = {
    context: "new context",
    instructions: "new instructions",
    organization: "new organization",
  }

  const grew = [...promptMessages(promptWithoutOrganization), history]
  replacePromptMessages(grew, promptWithoutOrganization, next)
  expect(grew).toEqual([...promptMessages(next), history])

  const shrank = [...promptMessages(promptWithOrganization), history]
  replacePromptMessages(shrank, promptWithOrganization, {
    ...next,
    organization: null,
  })
  expect(shrank).toEqual([
    { content: "new instructions", role: "system" },
    { content: "new context", role: "user" },
    history,
  ])

  const malformed = [history]
  replacePromptMessages(malformed, promptWithoutOrganization, next)
  expect(malformed).toEqual([history])
})
