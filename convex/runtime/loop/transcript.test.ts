import { expect, test } from "vitest"
import {
  type RuntimeInteraction,
  type RuntimeMessage,
} from "../../../contracts/runtime/context"
import { createPlatform } from "../../../test/platform"
import {
  createRuntime,
  runtimeContext,
  runtimeId,
  runtimePrompt,
} from "../../../test/runtime"
import {
  appendSessionMessages,
  formatSessionInteraction,
  formatSessionMessage,
  promptMessages,
} from "./transcript"

test("formats drained messages like conversation messages", () => {
  const formatted = formatSessionMessage(runtimeMessage())

  expect(
    formatted
  ).toBe(`- 2026-06-22T09:34:35.618Z | self | Jori | identifiers=[internal:message:message, slack:message:1782231485.491049] | actor_ids=[slack:user:U0B96KZ7WJG]
\`\`\`text
Here's what I've got.
\`\`\``)
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

test.each([
  undefined,
  ["# Recent activity — Albin"],
])("appends drained messages after optional person context: %s", async (contexts) => {
  const platform = createPlatform({
    sessions: [{ contexts, hasMore: false, messages: [runtimeMessage()] }],
  })
  const runtime = createRuntime({
    context: runtimeContext({
      session: { id: runtimeId<"sessions">("session") },
    }),
    platform,
  })

  await expect(appendSessionMessages(runtime)).resolves.toBe(true)
  expect(platform.transcript).toEqual([
    ...(contexts ?? []).map((content) => ({ content, role: "user" })),
    {
      content: expect.stringContaining("Here's what I've got."),
      role: "user",
    },
  ])
})

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

const barePrompt = runtimePrompt({ instructions: "instructions" })
const fullPrompt = runtimePrompt({
  instructions: "instructions",
  organization: "organization",
  person: "person",
  place: "place",
  requester: "requester",
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
