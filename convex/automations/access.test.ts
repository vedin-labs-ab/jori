import { describe, expect, test } from "vitest"
import { defaultScopeForIntegrations } from "../../contracts/permissions/scope"
import { type Id } from "../_generated/dataModel"
import {
  type AutomationAccess,
  canAccessAutomation,
  canUseAutomationTool,
  resolveToolAccessLevel,
} from "./access"

describe("automation tool access", () => {
  test("derives integration access from selected tools", () => {
    const githubId = "github-integration" as Id<"integrations">
    const access = automationAccess(githubId, [
      "github_get_issue",
      "github_add_issue_comment",
    ])

    expect(resolveToolAccessLevel(access.integrations[0]?.tools ?? [])).toBe(
      "both"
    )
    expect(canUseAutomationTool(access, githubId, "github_get_issue")).toBe(
      true
    )
    expect(canUseAutomationTool(access, githubId, "github_create_issue")).toBe(
      false
    )
  })

  test("returns no access without selected tools for the integration", () => {
    expect(resolveToolAccessLevel([])).toBe("none")
  })
})

function automationAccess(
  integrationId: Id<"integrations">,
  tools: string[]
): AutomationAccess {
  return {
    integrations: tools.length === 0 ? [] : [{ id: integrationId, tools }],
    web: true,
  }
}

describe("automation scope access", () => {
  const me = "me" as Id<"persons">
  const other = "other" as Id<"persons">

  test("organization automations are open to every member", () => {
    expect(
      canAccessAutomation(
        { scope: "organization", principal: { kind: "organization" } },
        me
      )
    ).toBe(true)
  })

  test("personal automations are principal-owner only", () => {
    expect(
      canAccessAutomation(
        { scope: "personal", principal: { kind: "person", personId: other } },
        me
      )
    ).toBe(false)
    expect(
      canAccessAutomation(
        { scope: "personal", principal: { kind: "person", personId: me } },
        me
      )
    ).toBe(true)
  })

  test("scope defaults from the tools in play", () => {
    expect(defaultScopeForIntegrations([])).toBe("personal")
    expect(defaultScopeForIntegrations(["gmail"])).toBe("personal")
    expect(defaultScopeForIntegrations(["github", "slack"])).toBe(
      "organization"
    )
    expect(defaultScopeForIntegrations(["slack", "gmail"])).toBe("personal")
  })
})
