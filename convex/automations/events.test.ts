import { describe, expect, test } from "vitest"
import {
  assertAutomationEventIsAvailable,
  automationEventParameterResetKeys,
  getAutomationEventDefinition,
  normalizeAutomationEventMatch,
} from "./events"

describe("automation event catalog match", () => {
  test("normalizes required option and optional text match", () => {
    const definition = requireEvent(
      "github",
      "pull_request.review_comment.edited"
    )

    expect(
      normalizeAutomationEventMatch(definition, {
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

  test("normalizes number match", () => {
    const definition = requireEvent("googleCalendar", "event.starting_soon")

    expect(
      normalizeAutomationEventMatch(definition, {
        calendar: "primary",
        leadMinutes: "15",
      })
    ).toEqual({ calendar: "primary", leadMinutes: 15 })
  })

  test("rejects invalid email match", () => {
    const definition = requireEvent("gmail", "message.received")

    expect(() =>
      normalizeAutomationEventMatch(definition, {
        from: "not an email",
      })
    ).toThrow("From must be an email address.")
  })

  test("keeps pending event-triggered automations explicit", () => {
    expect(() =>
      assertAutomationEventIsAvailable(
        requireEvent("gmail", "message.received")
      )
    ).toThrow(
      "Gmail event-triggered automations need mailbox subscriptions before they can run."
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
  test("declares separate created and edited comment events", () => {
    expect(requireEvent("github", "issue.comment.created")).toMatchObject({
      label: "Issue comment created",
    })
    expect(requireEvent("github", "issue.comment.edited")).toMatchObject({
      label: "Issue comment edited",
    })
    expect(requireEvent("linear", "issue.comment.created")).toMatchObject({
      label: "Issue comment created",
    })
    expect(requireEvent("linear", "issue.comment.edited")).toMatchObject({
      label: "Issue comment edited",
    })
    expect(
      getAutomationEventDefinition("github", "issue.comment.changed")
    ).toBe(undefined)
  })

  test("declares GitHub hard option dependencies as reset dependencies", () => {
    const definition = requireEvent("github", "issue.comment.created")
    const issue = requireParameter(definition, "issue")

    expect(automationEventParameterResetKeys(issue)).toEqual(["repo"])
  })

  test("declares Linear scope reset dependencies", () => {
    const definition = requireEvent("linear", "issue.comment.edited")
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
      "pull_request.review_comment.edited"
    )
    const path = requireParameter(definition, "path")

    expect(automationEventParameterResetKeys(path)).toEqual(["repo", "pr"])
  })
})

function requireEvent(
  integration: Parameters<typeof getAutomationEventDefinition>[0],
  event: string
) {
  const definition = getAutomationEventDefinition(integration, event)

  if (definition === undefined) {
    throw new Error(`Missing test event ${integration}.${event}`)
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
