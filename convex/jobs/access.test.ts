import { describe, expect, test } from "vitest"
import { defaultVisibilityForIntegrations } from "../../contracts/visibility"
import { databaseContext } from "../../test/convex/database"
import { type Id } from "../_generated/dataModel"
import { createSight } from "../visibility/sight"
import { canSeeJob, type JobAccess, resolveToolAccessLevel } from "./access"

describe("job tool access", () => {
  test("derives integration access from selected tools", () => {
    const githubId = "github-integration" as Id<"integrations">
    const access = jobAccess(githubId, [
      "github_get_issue",
      "github_add_issue_comment",
    ])

    expect(resolveToolAccessLevel(access.integrations[0]?.tools ?? [])).toBe(
      "both"
    )
  })

  test("returns no access without selected tools for the integration", () => {
    expect(resolveToolAccessLevel([])).toBe("none")
  })
})

function jobAccess(
  integrationId: Id<"integrations">,
  tools: string[]
): JobAccess {
  return {
    integrations: tools.length === 0 ? [] : [{ id: integrationId, tools }],
    jori: [],
  }
}

describe("job visibility", () => {
  const me = "me" as Id<"persons">
  const other = "other" as Id<"persons">

  function sightFor(personId: Id<"persons">) {
    const { ctx } = databaseContext()

    return createSight(ctx, { organizationId: "org", personId })
  }

  test("organization jobs are open to every member", async () => {
    expect(
      await canSeeJob(sightFor(me), {
        organizationId: "org",
        visibility: { mode: "organization" },
        principal: { kind: "organization" },
        createdBy: other,
      })
    ).toBe(true)
  })

  test("private jobs are principal-owner only", async () => {
    const privateOf = (personId: Id<"persons">) => ({
      organizationId: "org",
      visibility: { mode: "private" as const },
      principal: { kind: "person" as const, personId },
      createdBy: personId,
    })

    expect(await canSeeJob(sightFor(me), privateOf(other))).toBe(false)
    expect(await canSeeJob(sightFor(me), privateOf(me))).toBe(true)
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
