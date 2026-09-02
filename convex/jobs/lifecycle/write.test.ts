import { describe, expect, test } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { ownedJobsAreStale } from "./write"

describe("owned job invalidation", () => {
  const existing = job()

  test.each([
    ["instructions", { instructions: "New destination." }],
    ["visibility", { visibility: { mode: "organization" as const } }],
    ["access", { access: { integrations: [], web: true } }],
    ["type", { type: "once" as const }],
    [
      "trigger",
      {
        trigger: {
          expression: "0 9 * * *",
          nextAt: 2,
          timezone: "UTC",
        },
      },
    ],
  ])("invalidates children after a %s change", (_label, patch) => {
    expect(ownedJobsAreStale(existing, patch)).toBe(true)
  })

  test("keeps children for display-only or equivalent updates", () => {
    expect(ownedJobsAreStale(existing, { name: "Renamed" })).toBe(false)
    expect(
      ownedJobsAreStale(existing, {
        instructions: existing.instructions,
        trigger: { ...existing.trigger, nextAt: 2 },
      })
    ).toBe(false)
  })
})

function job(): Doc<"jobs"> {
  return {
    _id: "parent" as Id<"jobs">,
    _creationTime: 0,
    access: { integrations: [], web: false },
    createdAt: 0,
    instructions: "Deliver to Sam.",
    name: "Daily Digest",
    principal: {
      kind: "person",
      personId: "person" as Id<"persons">,
    },
    visibility: { mode: "private" },
    status: "active",
    organizationId: "organization",
    trigger: {
      expression: "0 8 * * *",
      nextAt: 1,
      timezone: "UTC",
    },
    type: "cron",
    updatedAt: 0,
  }
}
