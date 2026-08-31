import { describe, expect, test } from "vitest"
import { defaultVisibilityForIntegrations } from "../../contracts/visibility"
import { databaseContext } from "../../test/convex/database"
import { type Id } from "../_generated/dataModel"
import { createSight } from "../visibility/sight"
import {
  type AutomationAccess,
  canSeeAutomation,
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

describe("automation visibility", () => {
  const me = "me" as Id<"persons">
  const other = "other" as Id<"persons">

  function sightFor(personId: Id<"persons">) {
    const { ctx } = databaseContext()

    return createSight(ctx, { organizationId: "org", personId })
  }

  test("organization automations are open to every member", async () => {
    expect(
      await canSeeAutomation(sightFor(me), {
        organizationId: "org",
        visibility: { mode: "organization" },
        principal: { kind: "organization" },
        createdBy: other,
      })
    ).toBe(true)
  })

  test("private automations are principal-owner only", async () => {
    const privateOf = (personId: Id<"persons">) => ({
      organizationId: "org",
      visibility: { mode: "private" as const },
      principal: { kind: "person" as const, personId },
      createdBy: personId,
    })

    expect(await canSeeAutomation(sightFor(me), privateOf(other))).toBe(false)
    expect(await canSeeAutomation(sightFor(me), privateOf(me))).toBe(true)
  })

  test("visibility defaults from the tools in play", () => {
    expect(defaultVisibilityForIntegrations([])).toEqual({ mode: "private" })
    expect(defaultVisibilityForIntegrations(["gmail"])).toEqual({
      mode: "private",
    })
    expect(defaultVisibilityForIntegrations(["github", "slack"])).toEqual({
      mode: "organization",
    })
    expect(defaultVisibilityForIntegrations(["slack", "gmail"])).toEqual({
      mode: "private",
    })
  })
})
