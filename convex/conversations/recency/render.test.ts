import { expect, test } from "vitest"
import { type Id } from "../../_generated/dataModel"
import { renderRecentActivity } from "./render"

test("renders summary and reference entries under the person's heading", () => {
  const rendered = renderRecentActivity({
    entries: [
      {
        ageMs: 19 * 60_000,
        conversationId: "recent" as Id<"conversations">,
        identifiers: ["internal:conversation:recent", "slack:channel:C1"],
        integration: "slack",
        kind: "summary",
        summary: "Albin wants Milo to generate a cartoon avatar of him.",
      },
      {
        conversationId: "other" as Id<"conversations">,
        identifiers: ["internal:conversation:other"],
        integration: "github",
        kind: "reference",
      },
    ],
    name: "Albin",
  })

  expect(rendered).toContain("# Recent activity — Albin")
  expect(rendered).toContain(
    "Use this privacy-scoped recent context as your memory of Albin's other conversations to interpret their messages and preserve continuity. Mention it only when directly relevant."
  )
  expect(rendered).toContain(
    "- Slack | identifiers=[internal:conversation:recent, slack:channel:C1] | summary updated 19 minutes ago"
  )
  expect(rendered).toContain(
    "```text\nAlbin wants Milo to generate a cartoon avatar of him.\n```"
  )
  expect(rendered).toContain(
    "- GitHub | identifiers=[internal:conversation:other] | summarized above"
  )
  expect(rendered).not.toContain("undefined")
})
