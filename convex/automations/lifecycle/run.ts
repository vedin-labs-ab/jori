import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { createAutomationRunSnapshot } from "../../runs/snapshot"
import { queueRun } from "../../runtime/outbox"

export async function createAutomationRun(
  ctx: MutationCtx,
  args: {
    automation: Doc<"automations">
    event?: Doc<"events"> | null
    integration?: Doc<"integrations"> | null
    reason: Doc<"runs">["reason"]
    now: number
  }
) {
  const runId = await ctx.db.insert("runs", {
    tenantId: args.automation.tenantId,
    automationId: args.automation._id,
    reason: args.reason,
    ...createAutomationRunSnapshot(args),
    status: "queued",
    createdBy: args.automation.createdBy,
    createdAt: args.now,
  })

  await queueRun(ctx, runId)

  return runId
}
