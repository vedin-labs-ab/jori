import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"

export async function recordApprovalEvent(
  ctx: MutationCtx,
  args: {
    approval: Doc<"approvals">
    data?: Doc<"approvalEvents">["data"]
    syncSurface?: boolean
    type: Doc<"approvalEvents">["type"]
  }
) {
  await ctx.db.insert("approvalEvents", {
    tenantId: args.approval.tenantId,
    approvalId: args.approval._id,
    runId: args.approval.runId,
    surface: args.approval.surface,
    status: args.approval.status,
    type: args.type,
    data: args.data,
    createdAt: Date.now(),
  })

  if (args.syncSurface === true) {
    await ctx.scheduler.runAfter(0, internal.approvals.lifecycle.sync, {
      approvalId: args.approval._id,
    })
  }
}
