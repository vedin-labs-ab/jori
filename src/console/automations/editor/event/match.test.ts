import {
  type AutomationEventDefinition,
  getAutomationEventDefinition,
} from "@contracts/automations/events"
import { describe, expect, test } from "vitest"
import { applyEventMatchChange, removeEventMatch } from "./match"

describe("automation event match hard dependencies", () => {
  test("clears hard dependent match when a parent changes", () => {
    const event = requireEvent("github", "issue.comment.created")

    expect(
      applyEventMatchChange({
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

  test("preserves dependent match when a parent value is unchanged", () => {
    const event = requireEvent("github", "issue.comment.created")
    const values = {
      repo: "milo/app",
      issue: "42",
    }

    expect(
      applyEventMatchChange({
        key: "repo",
        parameters: event.parameters ?? [],
        value: "milo/app",
        values,
      })
    ).toBe(values)
  })
})

describe("automation event match Linear dependencies", () => {
  test("clears transitive Linear scope match when the team changes", () => {
    const event = requireEvent("linear", "issue.comment.created")

    expect(
      applyEventMatchChange({
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

  test("clears Linear issue match when the project changes", () => {
    const event = requireEvent("linear", "issue.comment.created")

    expect(
      applyEventMatchChange({
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

  test("preserves Linear scope match when only the issue changes", () => {
    const event = requireEvent("linear", "issue.comment.created")

    expect(
      applyEventMatchChange({
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

describe("automation event match text dependencies", () => {
  test("clears review comment path when its pull request changes", () => {
    const event = requireEvent("github", "pull_request.review_comment.edited")

    expect(
      applyEventMatchChange({
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

describe("automation event match removal", () => {
  test("keeps soft-dependent match when a scoping condition is removed", () => {
    const event = requireEvent("linear", "issue.comment.edited")

    expect(
      removeEventMatch({
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

  test("clears hard-dependent match when their parent is removed", () => {
    const event = requireEvent("github", "issue.comment.created")

    expect(
      removeEventMatch({
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
  integration: Parameters<typeof getAutomationEventDefinition>[0],
  event: string
): AutomationEventDefinition {
  const definition = getAutomationEventDefinition(integration, event)

  if (definition === undefined) {
    throw new Error(`Missing test event ${integration}.${event}`)
  }

  return definition
}
