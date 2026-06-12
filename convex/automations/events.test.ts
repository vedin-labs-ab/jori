import { describe, expect, test } from "vitest"
import {
  assertAutomationEventIsAvailable,
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

  test("keeps pending delivery explicit", () => {
    expect(() =>
      assertAutomationEventIsAvailable(
        requireEvent("googleDrive", "file.updated")
      )
    ).toThrow(
      "Google Drive event delivery needs Drive change subscriptions before automations can run."
    )
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
