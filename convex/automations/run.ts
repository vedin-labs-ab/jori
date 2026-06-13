import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"

export async function createAutomationRun(
  ctx: MutationCtx,
  args: {
    automation: Doc<"automations">
    reason: Doc<"runs">["reason"]
    now: number
  }
) {
  const runId = await ctx.db.insert("runs", {
    tenantId: args.automation.tenantId,
    automationId: args.automation._id,
    reason: args.reason,
    data: {
      automationInstructions: args.automation.instructions,
      automationName: args.automation.name,
    },
    createdBy: args.automation.createdBy,
    createdAt: args.now,
  })

  await ctx.scheduler.runAfter(0, internal.executions.runtime.runAutomation, {
    runId,
  })

  return runId
}
