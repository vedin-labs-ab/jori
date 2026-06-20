import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"

export async function getRunContext(
  ctx: QueryCtx,
  run: Doc<"runs">,
  requestedApproval: Doc<"approvals"> | undefined
) {
  const runApproval =
    requestedApproval ?? (await getLatestRequestedApproval(ctx, run))
  const message =
    run.reason.type === "message"
      ? await ctx.db.get(run.reason.messageId)
      : null
  const automation =
    run.automationId === undefined ? null : await ctx.db.get(run.automationId)
  const event =
    run.reason.type === "event" ? await ctx.db.get(run.reason.eventId) : null
  const integration =
    message?.integrationId === undefined
      ? event?.integrationId === undefined
        ? null
        : await ctx.db.get(event.integrationId)
      : await ctx.db.get(message.integrationId)
  const approvalDeliveryIntegration =
    runApproval?.delivery === undefined
      ? null
      : await ctx.db.get(runApproval.delivery.integrationId)

  return {
    approval: runApproval,
    approvalDeliveryIntegration,
    automation,
    event,
    integration,
    message,
    requestedApproval: runApproval,
    run,
  }
}

async function getLatestRequestedApproval(ctx: QueryCtx, run: Doc<"runs">) {
  return await ctx.db
    .query("approvals")
    .withIndex("by_run", (index) => index.eq("runId", run._id))
    .order("desc")
    .first()
}
