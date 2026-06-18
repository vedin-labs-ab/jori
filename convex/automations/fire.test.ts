import { describe, expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { matchesEvent } from "./lifecycle/fire"

describe("automation event matching", () => {
  test("matches when trigger criteria are a subset of event criteria", () => {
    expect(
      matchesEvent(
        automation({ repo: "milo/app" }),
        event({ repo: "milo/app", issue: "42" })
      )
    ).toBe(true)
  })

  test("rejects mismatched criteria", () => {
    expect(
      matchesEvent(
        automation({ repo: "milo/app", issue: "41" }),
        event({ repo: "milo/app", issue: "42" })
      )
    ).toBe(false)
  })
})

function automation(
  criteria: NonNullable<
    Extract<Doc<"automations">["trigger"], { type: "event" }>["criteria"]
  >
): Doc<"automations"> {
  return {
    _id: "automation",
    _creationTime: 0,
    tenantId: "tenant",
    name: "Automation",
    instructions: "Do work.",
    access: { integrations: [], web: true },
    type: "event",
    trigger: {
      type: "event",
      integrationId: "integration",
      event: "issue.comment.created",
      criteria,
    },
    status: "active",
    createdAt: 0,
    updatedAt: 0,
  } as unknown as Doc<"automations">
}

function event(
  criteria: NonNullable<Doc<"events">["criteria"]>
): Doc<"events"> {
  return {
    _id: "event",
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: "integration",
    key: "event-key",
    type: "issue.comment.created",
    criteria,
    createdAt: 0,
  } as unknown as Doc<"events">
}
