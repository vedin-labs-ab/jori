import { describe, expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { matchesEvent } from "./lifecycle/fire"

describe("job event matching", () => {
  test("matches when trigger match are a subset of event match", () => {
    expect(
      matchesEvent(
        job({ repo: "jori/app" }),
        event({ repo: "jori/app", issue: "42" })
      )
    ).toBe(true)
  })

  test("rejects mismatched match", () => {
    expect(
      matchesEvent(
        job({ repo: "jori/app", issue: "41" }),
        event({ repo: "jori/app", issue: "42" })
      )
    ).toBe(false)
  })
})

function job(
  match: NonNullable<
    Extract<Doc<"jobs">["trigger"], { event: string }>["match"]
  >
): Doc<"jobs"> {
  return {
    _id: "job",
    _creationTime: 0,
    organizationId: "organization",
    name: "Job",
    instructions: "Do work.",
    access: { integrations: [], web: true },
    type: "event",
    trigger: {
      integrationId: "integration",
      event: "issue.comment.created",
      match,
    },
    status: "active",
    createdAt: 0,
    updatedAt: 0,
  } as unknown as Doc<"jobs">
}

function event(match: NonNullable<Doc<"events">["match"]>): Doc<"events"> {
  return {
    _id: "event",
    _creationTime: 0,
    organizationId: "organization",
    integrationId: "integration",
    key: "event-key",
    type: "issue.comment.created",
    match,
    createdAt: 0,
  } as unknown as Doc<"events">
}
