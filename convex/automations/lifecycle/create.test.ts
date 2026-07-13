import { expect, test, vi } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { createAutomation } from "./create"

test.each([
  undefined,
  1,
])("rejects owned work from stale parent configuration %s", async (expectedParentConfigurationVersion) => {
  const parent = automation({ configurationVersion: 2 })
  const ctx = {
    db: { get: vi.fn(async () => parent) },
  } as unknown as MutationCtx

  await expect(
    createAutomation(ctx, {
      tenantId: "tenant",
      parentId: parent._id,
      expectedParentConfigurationVersion,
      name: "Meeting Briefing delivery",
      instructions: "Deliver the briefing.",
      scope: "personal",
      access: { integrations: [], web: false },
      type: "once",
      trigger: { at: "2030-01-01T08:00:00Z" },
      createdBy: "person" as Id<"persons">,
    })
  ).rejects.toThrow("configuration has changed")
})

function automation(input: {
  configurationVersion: number
}): Doc<"automations"> {
  return {
    _id: "parent" as Id<"automations">,
    _creationTime: 0,
    tenantId: "tenant",
    configurationVersion: input.configurationVersion,
    name: "Meeting Briefing",
    instructions: "Plan briefings.",
    scope: "personal",
    principal: {
      kind: "person",
      personId: "person" as Id<"persons">,
    },
    access: { integrations: [], web: false },
    type: "cron",
    trigger: {
      expression: "0 7 * * *",
      timezone: "UTC",
      nextAt: 1,
    },
    status: "active",
    createdAt: 0,
    updatedAt: 0,
  }
}
