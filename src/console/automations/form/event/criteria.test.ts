import {
  type AutomationEventDefinition,
  getAutomationEventDefinition,
} from "@contracts/automations/events"
import { describe, expect, test } from "vitest"
import { applyEventCriteriaChange, removeEventCriterion } from "./criteria"

describe("automation event criteria hard dependencies", () => {
  test("clears hard dependent criteria when a parent changes", () => {
    const event = requireEvent("github", "issue.comment.created")

    expect(
      applyEventCriteriaChange({
        key: "repo",
        parameters: event.parameters ?? [],
        value: "milo/api",
        values: {
          repo: "milo/app",
          issue: "42",
        },
      })
    ).toEqual({ repo: "milo/api" })
  })

  test("preserves dependent criteria when a parent value is unchanged", () => {
    const event = requireEvent("github", "issue.comment.created")
    const values = {
      repo: "milo/app",
      issue: "42",
    }

    expect(
      applyEventCriteriaChange({
        key: "repo",
        parameters: event.parameters ?? [],
        value: "milo/app",
        values,
      })
    ).toBe(values)
  })
})

describe("automation event criteria Linear dependencies", () => {
  test("clears transitive Linear scope criteria when the team changes", () => {
    const event = requireEvent("linear", "issue.comment.created")

    expect(
      applyEventCriteriaChange({
        key: "team",
        parameters: event.parameters ?? [],
        value: "team-b",
        values: {
          team: "team-a",
          project: "project-a",
          issue: "issue-a",
        },
      })
    ).toEqual({ team: "team-b" })
  })

  test("clears Linear issue criteria when the project changes", () => {
    const event = requireEvent("linear", "issue.comment.created")

    expect(
      applyEventCriteriaChange({
        key: "project",
        parameters: event.parameters ?? [],
        value: "project-b",
        values: {
          team: "team-a",
          project: "project-a",
          issue: "issue-a",
        },
      })
    ).toEqual({ team: "team-a", project: "project-b" })
  })

  test("preserves Linear scope criteria when only the issue changes", () => {
    const event = requireEvent("linear", "issue.comment.created")

    expect(
      applyEventCriteriaChange({
        key: "issue",
        parameters: event.parameters ?? [],
        value: "issue-b",
        values: {
          team: "team-a",
          project: "project-a",
          issue: "issue-a",
        },
      })
    ).toEqual({
      team: "team-a",
      project: "project-a",
      issue: "issue-b",
    })
  })
})

describe("automation event criteria text dependencies", () => {
  test("clears review comment path when its pull request changes", () => {
    const event = requireEvent("github", "pull_request.review_comment.edited")

    expect(
      applyEventCriteriaChange({
        key: "pr",
        parameters: event.parameters ?? [],
        value: "43",
        values: {
          repo: "milo/app",
          pr: "42",
          path: "src/app.ts",
        },
      })
    ).toEqual({ repo: "milo/app", pr: "43" })
  })
})

describe("automation event criteria removal", () => {
  test("keeps soft-dependent criteria when a scoping condition is removed", () => {
    const event = requireEvent("linear", "issue.comment.edited")

    expect(
      removeEventCriterion({
        key: "team",
        parameters: event.parameters ?? [],
        values: {
          team: "team-a",
          project: "project-a",
          issue: "issue-a",
        },
      })
    ).toEqual({ project: "project-a", issue: "issue-a" })
  })

  test("clears hard-dependent criteria when their parent is removed", () => {
    const event = requireEvent("github", "issue.comment.created")

    expect(
      removeEventCriterion({
        key: "repo",
        parameters: event.parameters ?? [],
        values: {
          repo: "milo/app",
          issue: "42",
        },
      })
    ).toEqual({})
  })
})

function requireEvent(
  provider: Parameters<typeof getAutomationEventDefinition>[0],
  event: string
): AutomationEventDefinition {
  const definition = getAutomationEventDefinition(provider, event)

  if (definition === undefined) {
    throw new Error(`Missing test event ${provider}.${event}`)
  }

  return definition
}
