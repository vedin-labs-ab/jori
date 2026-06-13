import { describe, expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import {
  type AutomationAccess,
  canUseAutomationTool,
  getIntegrationAccess,
} from "./access"

describe("automation tool access", () => {
  test("derives integration access from selected tools", () => {
    const githubId = "github-integration" as Id<"integrations">
    const access = automationAccess(githubId, [
      "github_get_issue",
      "github_add_issue_comment",
    ])

    expect(getIntegrationAccess(access, githubId)).toBe("both")
    expect(canUseAutomationTool(access, githubId, "github_get_issue")).toBe(
      true
    )
    expect(canUseAutomationTool(access, githubId, "github_create_issue")).toBe(
      false
    )
  })

  test("returns no access without selected tools for the integration", () => {
    const githubId = "github-integration" as Id<"integrations">
    const slackId = "slack-integration" as Id<"integrations">

    expect(getIntegrationAccess(automationAccess(githubId, []), slackId)).toBe(
      "none"
    )
  })
})

function automationAccess(
  integrationId: Id<"integrations">,
  tools: string[]
): AutomationAccess {
  return {
    integrations: tools.length === 0 ? [] : [{ integrationId, tools }],
    web: true,
  }
}
