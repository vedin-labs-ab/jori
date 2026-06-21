import { expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { formatRoutingCapabilitySummary } from "./capabilities"

test("formats connected integrations with compact permission buckets", () => {
  const summary = formatRoutingCapabilitySummary({
    integrations: [integration("slack"), integration("github")],
    toolModes: new Map([
      ["github_add_issue_comment", "blocked" as const],
      ["github_reply_to_pull_request_review_comment", "blocked" as const],
    ]),
  })

  expect(summary).toContain("Connected:")
  expect(summary).toContain("- Milo | yes: capabilities, skills")
  expect(summary).toContain("web search")
  expect(summary).toContain("create artifacts")
  expect(summary).toContain(
    "- Slack | yes: channels, threads, search, users, send replies"
  )
  expect(summary).toContain(
    "- GitHub | yes: repos, issues, PRs, files | no: post comments"
  )
  expect(summary).toContain(
    "Connectable: Linear, Gmail, Google Calendar, Google Drive, Notion, Outlook Mail, Microsoft Calendar"
  )
})

function integration(
  integration: Doc<"integrations">["integration"]
): Pick<Doc<"integrations">, "integration"> {
  return { integration }
}
