import { beforeEach, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { releaseSubscription } from "../subscriptions/data"
import { deleteOwnedAutomations } from "./children"
import { pauseAutomation, removeAutomation } from "./control"
import { getOrganizationAutomation, getRequiredAutomation } from "./read"
import { cancelTrigger } from "./trigger"

vi.mock("../subscriptions/data", () => ({ releaseSubscription: vi.fn() }))
vi.mock("./children", () => ({ deleteOwnedAutomations: vi.fn() }))
vi.mock("./read", () => ({
  getRequiredAutomation: vi.fn(),
  getOrganizationAutomation: vi.fn(),
}))
vi.mock("./trigger", () => ({
  cancelTrigger: vi.fn(),
  scheduleNextCronAutomation: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(deleteOwnedAutomations).mockReset()
  vi.mocked(cancelTrigger).mockReset()
  vi.mocked(getRequiredAutomation).mockReset()
  vi.mocked(getOrganizationAutomation).mockReset()
  vi.mocked(releaseSubscription).mockReset()
})

test("pausing invalidates runs from the prior configuration", async () => {
  const automation = parentAutomation()
  const patch = vi.fn(async () => undefined)
  const ctx = { db: { patch } } as unknown as MutationCtx
  vi.mocked(getOrganizationAutomation).mockResolvedValue(automation)
  vi.mocked(getRequiredAutomation).mockResolvedValue({
    ...automation,
    configurationVersion: 8,
    status: "paused",
  })

  await pauseAutomation(ctx, {
    organizationId: automation.organizationId,
    automationId: automation._id,
  })

  expect(patch).toHaveBeenCalledWith(
    automation._id,
    expect.objectContaining({ configurationVersion: 8, status: "paused" })
  )
  expect(deleteOwnedAutomations).toHaveBeenCalledWith(ctx, automation._id)
})

test("removing stops the parent before deleting it and its children", async () => {
  const automation = eventAutomation()
  const remove = vi.fn(async () => undefined)
  const ctx = { db: { delete: remove } } as unknown as MutationCtx
  vi.mocked(getOrganizationAutomation).mockResolvedValue(automation)

  await removeAutomation(ctx, {
    organizationId: automation.organizationId,
    automationId: automation._id,
  })

  expect(cancelTrigger).toHaveBeenCalledWith(ctx, automation.trigger)
  expect(releaseSubscription).toHaveBeenCalledWith(ctx, {
    organizationId: automation.organizationId,
    trigger: automation.trigger,
    exceptAutomationId: automation._id,
  })
  expect(remove).toHaveBeenCalledWith(automation._id)
  expect(deleteOwnedAutomations).toHaveBeenCalledWith(ctx, automation._id)
})

function parentAutomation(): Doc<"automations"> {
  return {
    _id: "parent" as Id<"automations">,
    _creationTime: 0,
    organizationId: "organization",
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

function eventAutomation(): Doc<"automations"> {
  return {
    _id: "event" as Id<"automations">,
    _creationTime: 0,
    access: { integrations: [], web: false },
    createdAt: 0,
    instructions: "Handle the event.",
    name: "Event automation",
    principal: { kind: "organization" },
    scope: "organization",
    status: "active",
    organizationId: "organization",
    trigger: {
      integrationId: "integration" as Id<"integrations">,
      event: "message.created",
    },
    type: "event",
    updatedAt: 0,
  }
}
