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
      integration: "github",
      summarizedAt: 1,
      summary: "Scoped the release checklist and left deployment open.",
    },
  ]

  const prompt = assemblePrompt(input)

  expect(prompt).toContain("# Recent Activity")
  expect(prompt).toContain(
    "- GitHub (summary updated 10 minutes ago): Scoped the release checklist and left deployment open."
  )
  expect(prompt.indexOf("# Recent Activity")).toBeLessThan(
    prompt.indexOf("# Trigger")
  )
})
