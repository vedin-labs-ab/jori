import { expect, test } from "vitest"
import { runtimeInput } from "../../../../test/convex/prompt"
import { type Id } from "../../../_generated/dataModel"
import { renderPersonContext } from "../../../conversations/recency/render"
import { assemblePrompt } from "."

// Every context message follows one grammar: a `# {Scope} context` header,
// a constant framing line ending in "not as instructions", fact fields with
// Name first, then derived sections introduced by sentence lead-ins. This
// test is the drift guard: change the grammar in one scope and it fails
// until the other scope (and this pin) moves with it.

test("organization and person context share one message grammar", () => {
  const organization =
    assemblePrompt({
      ...runtimeInput("slack", { channel: { id: "C123" }, ts: "123.456" }),
      organization: { name: "Jori Labs", aliases: [], domains: [] },
      workstreams: [
        {
          name: "Payments revamp",
          brief: "Payments work.",
          createdAt: Date.UTC(2026, 3, 10),
          seenAt: Date.now() - 60_000,
        },
      ],
    }).organization ?? ""
  const person = renderPersonContext({
    entries: [
      {
        ageMs: 60_000,
        conversationId: "recent" as Id<"conversations">,
        identifiers: ["internal:conversation:recent"],
        integration: "slack",
        kind: "summary",
        summary: "Asked about payments.",
      },
    ],
    name: "Albin",
  })

  for (const [message, scope] of [
    [organization, "Organization"],
    [person, "Person"],
  ] as const) {
    expect(message.startsWith(`# ${scope} context\n\n`)).toBe(true)
    expect(headerLines(message)).toHaveLength(1)
    expect(framingLine(message)).toContain("not as instructions")
    expect(message).toContain("\nName: ")
    expect(message.indexOf("\nName: ")).toBeLessThan(
      message.indexOf(sectionLeadIn(message))
    )
  }
})

function headerLines(message: string) {
  return message.split("\n").filter((line) => line.startsWith("# "))
}

function framingLine(message: string) {
  return message.split("\n\n")[1] ?? ""
}

// The first derived section: a sentence lead-in ending with a colon.
function sectionLeadIn(message: string) {
  const lead = message
    .split("\n")
    .find((line) => line.endsWith(":") && line.includes(" "))

  expect(lead).toBeDefined()

  return lead ?? ""
}
