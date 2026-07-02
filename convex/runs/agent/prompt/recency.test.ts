import { expect, test } from "vitest"
import { type Id } from "../../../_generated/dataModel"
import { assemblePrompt } from "."
import { runtimeInput } from "./fixtures"

test("renders recent activity with surface and summary age", () => {
  const input = runtimeInput("slack", {
    channel: { id: "C123" },
    ts: "123.456",
  })

  if (input.type !== "message") {
    throw new Error("Expected message input.")
  }

  input.recency = [
    {
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
    },
  ]

  const prompt = assemblePrompt(input)

  expect(prompt).toContain("# Recent Activity")
  expect(prompt).toContain(
    [
      "- 1970-01-01T00:00:01.000Z | GitHub | identifiers=[internal:conversation:other-conversation, github:repository:acme/app, github:issue:acme/app#42] | summary updated 10 minutes ago",
      "```text",
      "Scoped the release checklist and left deployment open.",
      "```",
    ].join("\n")
  )
  expect(prompt.indexOf("# Recent Activity")).toBeLessThan(
    prompt.indexOf("# Trigger")
  )
})
