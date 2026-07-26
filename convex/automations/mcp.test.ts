import { expect, test, vi } from "vitest"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { callJoriTool } from "../broker/jori"
import { callJoriAutomationTool } from "./mcp"

test("automation runs own the one-time automations they create", async () => {
  const runMutation = vi.fn(async () => ({ created: true }))
  const automationId = "parent" as Id<"automations">

  await callJoriAutomationTool(
    { runMutation } as unknown as ActionCtx,
    {
      organizationId: "organization",
      createdBy: "person" as Id<"persons">,
      automationId,
      automationConfigurationVersion: 3,
    },
    { tool: "add_automation", args: automationArgs("once") }
  )

  expect(runMutation).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      expectedParentConfigurationVersion: 3,
      parentId: automationId,
      type: "once",
    })
  )
})

test("manual and durable creations stay unowned", async () => {
  const runMutation = vi.fn(async () => ({ created: true }))
  const ctx = { runMutation } as unknown as ActionCtx

  await callJoriAutomationTool(
    ctx,
    { organizationId: "organization", createdBy: "person" as Id<"persons"> },
    { tool: "add_automation", args: automationArgs("once") }
  )
  await callJoriAutomationTool(
    ctx,
    {
      organizationId: "organization",
      createdBy: "person" as Id<"persons">,
      automationId: "parent" as Id<"automations">,
    },
    { tool: "add_automation", args: automationArgs("cron") }
  )

  expect(runMutation).toHaveBeenNthCalledWith(
    1,
    expect.anything(),
    expect.objectContaining({ parentId: undefined, type: "once" })
  )
  expect(runMutation).toHaveBeenNthCalledWith(
    2,
    expect.anything(),
    expect.objectContaining({ parentId: undefined, type: "cron" })
  )
})

test("an owned run keeps its durable parent after the child fires", async () => {
  const runMutation = vi.fn(async () => ({ created: true }))

  await callJoriTool(
    { runMutation } as unknown as ActionCtx,
    {
      organizationId: "organization",
      principal: {
        kind: "person",
        personId: "person" as Id<"persons">,
      },
      automationId: "fired-child" as Id<"automations">,
      automationParentId: "parent" as Id<"automations">,
      automationConfigurationVersion: 4,
    },
    { tool: "add_automation", args: automationArgs("once") }
  )

  expect(runMutation).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      parentId: "parent",
      expectedParentConfigurationVersion: 4,
      type: "once",
    })
  )
})

test("known automation IDs remain directly readable", async () => {
  const runQuery = vi.fn(async () => ({ id: "child" }))
  const automationId = "child" as Id<"automations">

  await callJoriAutomationTool(
    { runQuery } as unknown as ActionCtx,
    { organizationId: "organization", createdBy: "person" as Id<"persons"> },
    { tool: "read_automation", args: { automationId } }
  )

  expect(runQuery).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ automationId, organizationId: "organization" })
  )
})

function automationArgs(type: "once" | "cron") {
  return {
    name: "Child",
    instructions: "Do the work.",
    type,
    trigger:
      type === "once"
        ? { at: "2030-01-01T08:00:00Z" }
        : { expression: "0 8 * * *", timezone: "UTC" },
    access: { integrations: [], web: false },
  }
}
