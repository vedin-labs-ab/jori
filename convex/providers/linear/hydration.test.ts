import { describe, expect, test } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { shouldHydrateLinearIssueProject } from "./hydration"

const integrationId = "linear-integration" as Id<"integrations">

describe("Linear issue project hydration pruning", () => {
  test("hydrates project-gated automations that match known criteria", () => {
    expect(
      shouldHydrateLinearIssueProject({
        automation: automation({ issue: "issue-id", team: "team-id" }),
        integrationId,
        event: "issue.comment.created",
        criteria: { issue: "issue-id", team: "team-id" },
      })
    ).toBe(true)
  })

  test("hydrates edited project-gated automations", () => {
    expect(
      shouldHydrateLinearIssueProject({
        automation: automation({
          event: "issue.comment.edited",
          issue: "issue-id",
        }),
        integrationId,
        event: "issue.comment.edited",
        criteria: { issue: "issue-id", team: "team-id" },
      })
    ).toBe(true)
  })

  test("hydrates when team is missing and the project automation may still match", () => {
    expect(
      shouldHydrateLinearIssueProject({
        automation: automation({ issue: "issue-id", team: "team-id" }),
        integrationId,
        event: "issue.comment.created",
        criteria: { issue: "issue-id" },
      })
    ).toBe(true)
  })
})

describe("Linear issue project hydration rejection", () => {
  test("skips hydration when known criteria rule out the automation", () => {
    expect(
      shouldHydrateLinearIssueProject({
        automation: automation({ issue: "other-issue", team: "team-id" }),
        integrationId,
        event: "issue.comment.created",
        criteria: { issue: "issue-id", team: "team-id" },
      })
    ).toBe(false)

    expect(
      shouldHydrateLinearIssueProject({
        automation: automation({ issue: "issue-id", team: "other-team" }),
        integrationId,
        event: "issue.comment.created",
        criteria: { issue: "issue-id", team: "team-id" },
      })
    ).toBe(false)
  })

  test("skips hydration without a project-gated Linear comment trigger", () => {
    expect(
      shouldHydrateLinearIssueProject({
        automation: automation({ project: null }),
        integrationId,
        event: "issue.comment.created",
        criteria: { issue: "issue-id", team: "team-id" },
      })
    ).toBe(false)

    expect(
      shouldHydrateLinearIssueProject({
        automation: automation({ event: "other.event" }),
        integrationId,
        event: "issue.comment.created",
        criteria: { issue: "issue-id", team: "team-id" },
      })
    ).toBe(false)
  })
})

function automation(
  criteria: {
    event?: string
    issue?: string
    project?: string | null
    team?: string
  } = {}
): Doc<"automations"> {
  const { event, issue, team } = criteria
  const project =
    criteria.project === null ? undefined : (criteria.project ?? "project-id")

  return {
    _creationTime: 0,
    _id: "automation-id" as Id<"automations">,
    access: { integrations: [], web: false },
    createdAt: 0,
    instructions: "Test",
    name: "Test automation",
    status: "active",
    tenantId: "tenant-id",
    type: "event",
    trigger: {
      integrationId,
      event: event ?? "issue.comment.created",
      criteria: eventCriteria({ issue, project, team }),
    },
    updatedAt: 0,
  }
}

function eventCriteria(criteria: {
  issue?: string
  project?: string
  team?: string
}) {
  return Object.fromEntries(
    Object.entries(criteria).filter((entry): entry is [string, string] => {
      return entry[1] !== undefined
    })
  )
}
