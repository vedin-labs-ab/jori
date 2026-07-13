import { expect, test, vi } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { releaseSubscription } from "../subscriptions/data"
import { getTenantAutomation } from "./read"
import { removeAutomation } from "./remove"

vi.mock("../subscriptions/data", () => ({ releaseSubscription: vi.fn() }))
vi.mock("./children", () => ({ deleteOwnedAutomations: vi.fn() }))
vi.mock("./read", () => ({ getTenantAutomation: vi.fn() }))
vi.mock("./trigger", () => ({ cancelTrigger: vi.fn() }))

test("removal excludes its own event automation when releasing access", async () => {
  const automation = eventAutomation()
  const ctx = {
    db: { delete: vi.fn(async () => undefined) },
  } as unknown as MutationCtx
  vi.mocked(getTenantAutomation).mockResolvedValue(automation)

  await removeAutomation(ctx, {
    tenantId: automation.tenantId,
    automationId: automation._id,
  })

  expect(releaseSubscription).toHaveBeenCalledWith(ctx, {
    tenantId: automation.tenantId,
    trigger: automation.trigger,
    exceptAutomationId: automation._id,
  })
})

function eventAutomation(): Doc<"automations"> {
  return {
    _id: "automation" as Id<"automations">,
    _creationTime: 0,
    access: { integrations: [], web: false },
    createdAt: 0,
    instructions: "Handle the event.",
    name: "Event automation",
    principal: { kind: "organization" },
    scope: "organization",
    status: "active",
    tenantId: "tenant",
    trigger: {
      integrationId: "integration" as Id<"integrations">,
      event: "message.created",
    },
    type: "event",
    updatedAt: 0,
  }
}
