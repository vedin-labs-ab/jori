import { expect, test, vi } from "vitest"
import {
  type RuntimeInteraction,
  type RuntimeMessage,
} from "../../contracts/runtime/worker"
import { runtimeId } from "../../test/trigger"
import { type AgentRuntime } from "../runtime"
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
  ).toBe(`- 2026-06-22T09:34:35.618Z | self | Jori | identifiers=[internal:message:message, slack:message:1782231485.491049] | actor_ids=[slack:user:U0B96KZ7WJG]
\`\`\`text
Here's what I've got.
\`\`\``)
  expect(formatted).not.toContain("New slack message")
  expect(formatted).not.toContain("Authority:")
  expect(formatted).not.toContain("Mentioned Jori:")
  expect(formatted).not.toContain("Message:")
})

test("formats drained reaction interactions compactly", () => {
  const formatted = formatSessionInteraction(runtimeInteraction())

  expect(
    formatted
  ).toBe(`- 2026-06-22T09:35:00.000Z | reaction.added | person | Albin | reaction=✅ | identifiers=[linear:issue:ISS-1, linear:comment:comment] | actor_ids=[linear:user:user]
\`\`\`text
Reacted ✅ to Jori's message: "I can proceed with option B."
\`\`\``)
})

test("updates the active surface target from drained messages", async () => {
  const runtime = {
    platform: {
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
      session: { id: runtimeId<"sessions">("session") },
    },
  } as unknown as AgentRuntime
  const messages: Array<{ content: string; role: "user" }> = []

  await expect(appendSessionMessages(runtime, messages)).resolves.toBe(true)
  expect(runtime.context.activeSurface?.target).toBe("linear:thread:comment-id")
})

test("appends person context before drained batch items", async () => {
  const runtime = {
    platform: {
      drainSessionMessages: vi.fn(async () => ({
        contexts: ["# Recent activity — Albin"],
        hasMore: false,
        messages: [runtimeMessage({ source: "person" })],
      })),
    },
    context: {
      activeSurface: null,
      session: { id: runtimeId<"sessions">("session") },
    },
  } as unknown as AgentRuntime
  const messages: Array<{ content: string; role: "user" }> = []

  await expect(appendSessionMessages(runtime, messages)).resolves.toBe(true)
  expect(messages[0]).toEqual({
    content: "# Recent activity — Albin",
    role: "user",
  })
  expect(messages).toHaveLength(2)
})

function runtimeMessage(
  overrides: Partial<RuntimeMessage> = {}
): RuntimeMessage {
  return {
    actor: "Jori",
    actorIds: ["slack:user:U0B96KZ7WJG"],
    authority: "soft",
    createdAt: Date.parse("2026-06-22T09:34:35.000Z"),
    id: runtimeId<"messages">("message"),
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
    id: runtimeId<"reactions">("reaction"),
    identifiers: ["linear:issue:ISS-1", "linear:comment:comment"],
    observedAt: Date.parse("2026-06-22T09:35:00.000Z"),
    preview: "I can proceed with option B.",
    reaction: "✅",
    source: "person",
    target: "Jori",
    type: "reaction.added",
    ...overrides,
  }
}

const fullPrompt = {
  context: "context",
  instructions: "instructions",
  organization: "organization",
  place: "place",
  person: "person",
  requester: "requester",
}
const barePrompt = {
  context: "context",
  instructions: "instructions",
  organization: null,
  place: null,
  person: null,
  requester: null,
}

test("builds the prompt prefix from the present context messages in order", () => {
  expect(promptMessages(barePrompt)).toEqual([
    { content: "instructions", role: "system" },
    { content: "context", role: "user" },
  ])
  expect(promptMessages(fullPrompt)).toEqual([
    { content: "instructions", role: "system" },
    { content: "organization", role: "user" },
    { content: "requester", role: "user" },
    { content: "place", role: "user" },
    { content: "person", role: "user" },
    { content: "context", role: "user" },
  ])
  expect(promptMessages({ ...barePrompt, person: "person" })).toEqual([
    { content: "instructions", role: "system" },
    { content: "person", role: "user" },
    { content: "context", role: "user" },
  ])
})

test("replaces the prompt prefix in place across all shapes", () => {
  const history = { content: "history", role: "user" as const }
  const next = {
    context: "new context",
    instructions: "new instructions",
    organization: "new organization",
    place: "new place",
    person: "new person",
    requester: "new requester",
  }

  const grew = [...promptMessages(barePrompt), history]
  replacePromptMessages(grew, barePrompt, next)
  expect(grew).toEqual([...promptMessages(next), history])

  const shrank = [...promptMessages(fullPrompt), history]
  replacePromptMessages(shrank, fullPrompt, {
    ...next,
    organization: null,
    place: null,
    person: null,
    requester: null,
  })
  expect(shrank).toEqual([
    { content: "new instructions", role: "system" },
    { content: "new context", role: "user" },
    history,
  ])

  const malformed = [history]
  replacePromptMessages(malformed, barePrompt, next)
  expect(malformed).toEqual([history])
})
