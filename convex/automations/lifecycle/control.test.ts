import { beforeEach, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { deleteOwnedAutomations } from "./children"
import { pauseAutomation } from "./control"
import { getRequiredAutomation, getTenantAutomation } from "./read"
import { cancelTrigger } from "./trigger"

vi.mock("./children", () => ({ deleteOwnedAutomations: vi.fn() }))
vi.mock("./read", () => ({
  getRequiredAutomation: vi.fn(),
  getTenantAutomation: vi.fn(),
}))
vi.mock("./trigger", () => ({
  cancelTrigger: vi.fn(),
  scheduleNextCronAutomation: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(deleteOwnedAutomations).mockReset()
  vi.mocked(cancelTrigger).mockReset()
  vi.mocked(getRequiredAutomation).mockReset()
  vi.mocked(getTenantAutomation).mockReset()
})

test("pausing invalidates runs from the prior configuration", async () => {
  const automation = parentAutomation()
  const patch = vi.fn(async () => undefined)
  const ctx = { db: { patch } } as unknown as MutationCtx
  vi.mocked(getTenantAutomation).mockResolvedValue(automation)
  vi.mocked(getRequiredAutomation).mockResolvedValue({
    ...automation,
    configurationVersion: 8,
    status: "paused",
  })

  await pauseAutomation(ctx, {
    tenantId: automation.tenantId,
    automationId: automation._id,
  })

  expect(patch).toHaveBeenCalledWith(
    automation._id,
    expect.objectContaining({ configurationVersion: 8, status: "paused" })
  )
  expect(deleteOwnedAutomations).toHaveBeenCalledWith(ctx, automation._id)
})

function parentAutomation(): Doc<"automations"> {
  return {
    _id: "parent" as Id<"automations">,
    _creationTime: 0,
    tenantId: "tenant",
    configurationVersion: 7,
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
