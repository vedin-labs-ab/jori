import { expect, test, vi } from "vitest"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { callJoriTool } from "../broker/jori"
import { callJoriJobTool } from "./mcp"

test("job runs own the one-time jobs they create", async () => {
  const runMutation = vi.fn(async () => ({ created: true }))
  const jobId = "parent" as Id<"jobs">

  await callJoriJobTool(
    { runMutation } as unknown as ActionCtx,
    {
      organizationId: "organization",
      createdBy: "person" as Id<"persons">,
      job: { id: jobId, version: 3 },
    },
    { tool: "add_job", args: jobArgs("once") }
  )

  expect(runMutation).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      parent: { id: jobId, version: 3 },
      type: "once",
    })
  )
})

test("manual and durable creations stay unowned", async () => {
  const runMutation = vi.fn(async () => ({ created: true }))
  const ctx = { runMutation } as unknown as ActionCtx

  await callJoriJobTool(
    ctx,
    { organizationId: "organization", createdBy: "person" as Id<"persons"> },
    { tool: "add_job", args: jobArgs("once") }
  )
  await callJoriJobTool(
    ctx,
    {
      organizationId: "organization",
      createdBy: "person" as Id<"persons">,
      job: { id: "parent" as Id<"jobs"> },
    },
    { tool: "add_job", args: jobArgs("cron") }
  )

  expect(runMutation).toHaveBeenNthCalledWith(
    1,
    expect.anything(),
    expect.objectContaining({ parent: undefined, type: "once" })
  )
  expect(runMutation).toHaveBeenNthCalledWith(
    2,
    expect.anything(),
    expect.objectContaining({ parent: undefined, type: "cron" })
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
      job: {
        id: "fired-child" as Id<"jobs">,
        parentId: "parent" as Id<"jobs">,
        version: 4,
      },
    },
    { tool: "add_job", args: jobArgs("once") }
  )

  expect(runMutation).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      parent: { id: "parent", version: 4 },
      type: "once",
    })
  )
})

test("known job IDs remain directly readable", async () => {
  const runQuery = vi.fn(async () => ({ id: "child" }))
  const jobId = "child" as Id<"jobs">

  await callJoriJobTool(
    { runQuery } as unknown as ActionCtx,
    { organizationId: "organization", createdBy: "person" as Id<"persons"> },
    { tool: "read_job", args: { jobId } }
  )

  expect(runQuery).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ jobId, organizationId: "organization" })
  )
})

function jobArgs(type: "once" | "cron") {
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
