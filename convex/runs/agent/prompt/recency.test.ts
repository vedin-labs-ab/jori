import { expect, test } from "vitest"
import { type Id } from "../../../_generated/dataModel"
import { assemblePrompt } from "."
import { runtimeInput } from "./fixtures"

test("renders recent activity with surface and summary age", () => {
  const input = messageInput()
  const summary = "Scoped the release checklist and left deployment open."

  input.recency = [recentActivity({ summary })]

  const prompt = assemblePrompt(input)

  expect(prompt).toContain("# Recent Activity")
  expect(prompt).toContain(
    [
      "- 1970-01-01T00:00:01.000Z | GitHub | identifiers=[internal:conversation:other-conversation, github:repository:acme/app, github:issue:acme/app#42] | summary updated 10 minutes ago",
      "```text",
      summary,
      "```",
    ].join("\n")
  )
  expect(prompt.indexOf("# Recent Activity")).toBeLessThan(
    prompt.indexOf("# Trigger")
  )
})

test("renders recent activity summaries without character truncation", () => {
  const input = messageInput()
  const summary = Array.from(
    { length: 360 },
    (_, index) => `summary-token-${index}`
  ).join(" ")

  input.recency = [recentActivity({ summary })]

  const prompt = assemblePrompt(input)

  expect(prompt).toContain(summary)
  expect(prompt).toContain("summary-token-359")
})

type MessageInput = Extract<
  Parameters<typeof assemblePrompt>[0],
  {
    type: "message"
  }
>
type RecentActivity = MessageInput["recency"][number]

function messageInput(): MessageInput {
  const input = runtimeInput("slack", {
    channel: { id: "C123" },
    ts: "123.456",
  })

  if (input.type !== "message") {
    throw new Error("Expected message input.")
  }

  return input
}

function recentActivity(
  overrides: Partial<RecentActivity> = {}
): RecentActivity {
  return {
    ageMs: 10 * 60_000,
    conversationId: "other-conversation" as Id<"conversations">,
    identifiers: [
      "internal:conversation:other-conversation",
      "github:repository:acme/app",
      "github:issue:acme/app#42",
    ],
    integration: "github",
    summarizedAt: 1_000,
    summary: "Scoped the release checklist and left deployment open.",
    ...overrides,
  }
}
