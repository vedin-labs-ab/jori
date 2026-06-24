import { expect, test } from "vitest"
import { type ConvexId, type RuntimeMessage } from "../types"
import { formatSessionMessage } from "./messages"

test("formats drained messages like conversation messages", () => {
  const message = {
    actor: "Milo",
    actorIds: ["slack:user:U0B96KZ7WJG"],
    authority: "soft",
    createdAt: Date.parse("2026-06-22T09:34:35.000Z"),
    id: id<"messages">("message"),
    integration: "slack",
    messageIds: ["internal:message:message", "slack:message:1782231485.491049"],
    mentioned: false,
    observedAt: Date.parse("2026-06-22T09:34:35.618Z"),
    source: "self",
    text: "Here's what I've got.",
    type: "message.channels",
  } satisfies RuntimeMessage
  const formatted = formatSessionMessage(message)

  expect(
    formatted
  ).toBe(`- 2026-06-22T09:34:35.618Z | self | Milo | message_ids=[internal:message:message, slack:message:1782231485.491049] | actor_ids=[slack:user:U0B96KZ7WJG]
\`\`\`text
Here's what I've got.
\`\`\``)
  expect(formatted).not.toContain("New slack message")
  expect(formatted).not.toContain("Authority:")
  expect(formatted).not.toContain("Mentioned Milo:")
  expect(formatted).not.toContain("Message:")
})

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}
