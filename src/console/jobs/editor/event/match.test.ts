import {
  getJobEventDefinition,
  type JobEventDefinition,
} from "@contracts/jobs/events"
import { describe, expect, test } from "vitest"
import { applyEventMatchChange, removeEventMatch } from "./match"

describe("job event match hard dependencies", () => {
  test("clears hard dependent match when a parent changes", () => {
    const event = requireEvent("github", "issue.comment.created")

    expect(
      applyEventMatchChange({
        key: "repo",
        parameters: event.parameters ?? [],
        value: "jori/api",
        values: {
          repo: "jori/app",
          issue: "42",
        },
      })
    ).toEqual({ repo: "jori/api" })
  })

  test("preserves dependent match when a parent value is unchanged", () => {
    const event = requireEvent("github", "issue.comment.created")
    const values = {
      repo: "jori/app",
      issue: "42",
    }

    expect(
      applyEventMatchChange({
        key: "repo",
        parameters: event.parameters ?? [],
        value: "jori/app",
        values,
      })
    ).toBe(values)
  })
})

describe("job event match Linear dependencies", () => {
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

describe("job event match text dependencies", () => {
  test("clears review comment path when its pull request changes", () => {
    const event = requireEvent("github", "pull_request.review_comment.edited")

    expect(
      applyEventMatchChange({
        key: "pr",
        parameters: event.parameters ?? [],
        value: "43",
        values: {
          repo: "jori/app",
          pr: "42",
          path: "src/app.ts",
        },
      })
    ).toEqual({ repo: "jori/app", pr: "43" })
  })
})

describe("job event match removal", () => {
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
          repo: "jori/app",
          issue: "42",
        },
      })
    ).toEqual({})
  })
})

function requireEvent(
  integration: Parameters<typeof getJobEventDefinition>[0],
  event: string
): JobEventDefinition {
  const definition = getJobEventDefinition(integration, event)

  if (definition === undefined) {
    throw new Error(`Missing test event ${integration}.${event}`)
  }

  return definition
}
