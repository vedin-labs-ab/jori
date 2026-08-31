import { expect, test, vi } from "vitest"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { loadRunBrokerContext } from "./auth"

test("stops an invalidated automation run before loading tool context", async () => {
  const runQuery = vi.fn(async () => false)
  const ctx = { runQuery } as unknown as ActionCtx
  const run = automationRun()

  await expect(loadRunBrokerContext(ctx, run)).resolves.toBeNull()
  expect(runQuery).toHaveBeenCalledTimes(1)
  expect(runQuery).toHaveBeenCalledWith(
    internal.automations.records.canExecuteRunTools,
    { runId: run._id }
  )
})

function automationRun(): Doc<"runs"> {
  return {
    _id: "run" as Id<"runs">,
    _creationTime: 0,
    access: { integrations: [], web: false },
    automationConfigurationVersion: 2,
    automationId: "automation" as Id<"automations">,
    cause: { type: "time", scheduledAt: 0 },
    createdAt: 0,
    principal: {
      kind: "person",
      personId: "person" as Id<"persons">,
    },
    audience: "person",
    snapshot: {
      context: [],
      source: { type: "automation" },
      title: "Automation",
    },
    status: "running",
    organizationId: "organization",
  }
}
