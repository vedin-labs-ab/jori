import { describe, expect, test } from "vitest"
import {
  assertAutomationEventIsAvailable,
  automationEventParameterResetKeys,
  getAutomationEventDefinition,
  normalizeAutomationEventCriteria,
} from "./events"

describe("automation event catalog criteria", () => {
  test("normalizes required option and optional text criteria", () => {
    const definition = requireEvent(
      "github",
      "pull_request.review_comment.changed"
    )

    expect(
      normalizeAutomationEventCriteria(definition, {
        repo: " milo/app ",
        pr: "42",
        path: " src/app.ts ",
      })
    ).toEqual({
      repo: "milo/app",
      pr: "42",
      path: "src/app.ts",
    })
  })

  test("normalizes number criteria", () => {
    const definition = requireEvent("googleCalendar", "event.starting_soon")

    expect(
      normalizeAutomationEventCriteria(definition, {
        calendar: "primary",
        leadMinutes: "15",
      })
    ).toEqual({ calendar: "primary", leadMinutes: 15 })
  })

  test("rejects invalid email criteria", () => {
    const definition = requireEvent("gmail", "message.received")

    expect(() =>
      normalizeAutomationEventCriteria(definition, {
        from: "not an email",
      })
    ).toThrow("From must be an email address.")
  })

  test("keeps pending event-triggered automations explicit", () => {
    expect(() =>
      assertAutomationEventIsAvailable(
        requireEvent("googleDrive", "file.updated")
      )
    ).toThrow(
      "Google Drive event-triggered automations need Drive change subscriptions before they can run."
    )
  })

  test("makes supported Notion webhook events available", () => {
    const definition = requireEvent("notion", "page.updated")

    expect(() => assertAutomationEventIsAvailable(definition)).not.toThrow()
    expect(requireParameter(definition, "page")).toMatchObject({
      required: true,
      source: "notion.pages",
    })
  })
})

describe("automation event catalog dependencies", () => {
  test("declares GitHub hard option dependencies as reset dependencies", () => {
    const definition = requireEvent("github", "issue.comment.changed")
    const issue = requireParameter(definition, "issue")

    expect(automationEventParameterResetKeys(issue)).toEqual(["repo"])
  })

  test("declares Linear scope reset dependencies", () => {
    const definition = requireEvent("linear", "issue.comment.changed")
    const project = requireParameter(definition, "project")
    const issue = requireParameter(definition, "issue")

    expect(automationEventParameterResetKeys(project)).toEqual(["team"])
    expect(automationEventParameterResetKeys(issue)).toEqual([
      "team",
      "project",
    ])
  })

  test("declares GitHub review path reset dependencies", () => {
    const definition = requireEvent(
      "github",
      "pull_request.review_comment.changed"
    )
    const path = requireParameter(definition, "path")

    expect(automationEventParameterResetKeys(path)).toEqual(["repo", "pr"])
  })
})

function requireEvent(
  provider: Parameters<typeof getAutomationEventDefinition>[0],
  event: string
) {
  const definition = getAutomationEventDefinition(provider, event)

  if (definition === undefined) {
    throw new Error(`Missing test event ${provider}.${event}`)
  }

  return definition
}

function requireParameter(
  definition: ReturnType<typeof requireEvent>,
  key: string
) {
  const parameter = definition.parameters?.find(
    (candidate) => candidate.key === key
  )

  if (parameter === undefined) {
    throw new Error(`Missing test parameter ${definition.value}.${key}`)
  }

  return parameter
}
