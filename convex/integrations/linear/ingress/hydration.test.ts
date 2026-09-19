import { describe, expect, test } from "vitest"
import { type Doc, type Id } from "../../../_generated/dataModel"
import { shouldHydrateLinearIssueProject } from "./hydration"

const integrationId = "linear-integration" as Id<"integrations">

describe("Linear issue project hydration pruning", () => {
  test("hydrates project-gated jobs that match known values", () => {
    expect(
      shouldHydrateLinearIssueProject({
        job: job({ issue: "issue-id", team: "team-id" }),
        integrationId,
        event: "issue.comment.created",
        match: { issue: "issue-id", team: "team-id" },
      })
    ).toBe(true)
  })

  test("hydrates edited project-gated jobs", () => {
    expect(
      shouldHydrateLinearIssueProject({
        job: job({
          event: "issue.comment.edited",
          issue: "issue-id",
        }),
        integrationId,
        event: "issue.comment.edited",
        match: { issue: "issue-id", team: "team-id" },
      })
    ).toBe(true)
  })

  test("hydrates when team is missing and the project job may still match", () => {
    expect(
      shouldHydrateLinearIssueProject({
        job: job({ issue: "issue-id", team: "team-id" }),
        integrationId,
        event: "issue.comment.created",
        match: { issue: "issue-id" },
      })
    ).toBe(true)
  })
})

describe("Linear issue project hydration rejection", () => {
  test("skips hydration when known values rule out the job", () => {
    expect(
      shouldHydrateLinearIssueProject({
        job: job({ issue: "other-issue", team: "team-id" }),
        integrationId,
        event: "issue.comment.created",
        match: { issue: "issue-id", team: "team-id" },
      })
    ).toBe(false)

    expect(
      shouldHydrateLinearIssueProject({
        job: job({ issue: "issue-id", team: "other-team" }),
        integrationId,
        event: "issue.comment.created",
        match: { issue: "issue-id", team: "team-id" },
      })
    ).toBe(false)
  })

  test("skips hydration without a project-gated Linear comment trigger", () => {
    expect(
      shouldHydrateLinearIssueProject({
        job: job({ project: null }),
        integrationId,
        event: "issue.comment.created",
        match: { issue: "issue-id", team: "team-id" },
      })
    ).toBe(false)

    expect(
      shouldHydrateLinearIssueProject({
        job: job({ event: "other.event" }),
        integrationId,
        event: "issue.comment.created",
        match: { issue: "issue-id", team: "team-id" },
      })
    ).toBe(false)
  })
})

function job(
  match: {
    event?: string
    issue?: string
    project?: string | null
    team?: string
  } = {}
): Doc<"jobs"> {
  const { event, issue, team } = match
  const project =
    match.project === null ? undefined : (match.project ?? "project-id")

  return {
    _creationTime: 0,
    _id: "job-id" as Id<"jobs">,
    access: { integrations: [], jori: [] },
    createdAt: 0,
    instructions: "Test",
    name: "Test job",
    principal: { kind: "person", personId: "person" as Id<"persons"> },
    status: "active",
    organizationId: "organization-id",
    type: "event",
    visibility: { mode: "private" },
    trigger: {
      integrationId,
      event: event ?? "issue.comment.created",
      match: eventMatch({ issue, project, team }),
    },
    updatedAt: 0,
  }
}

function eventMatch(match: {
  issue?: string
  project?: string
  team?: string
}) {
  return Object.fromEntries(
    Object.entries(match).filter((entry): entry is [string, string] => {
      return entry[1] !== undefined
    })
  )
}
