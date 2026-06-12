import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"

export async function getExecutionContext(
  ctx: QueryCtx,
  execution: Doc<"executions">,
  requestedApproval: Doc<"approvals"> | undefined
) {
  const run = await ctx.db.get(execution.runId)
  const continuationApproval =
    execution.approvalId === undefined
      ? null
      : await ctx.db.get(execution.approvalId)
  const executionRequestedApproval =
    requestedApproval ?? (await getLatestRequestedApproval(ctx, execution))
  const approval = executionRequestedApproval ?? continuationApproval
  const message =
    run?.reason.type === "message"
      ? await ctx.db.get(run.reason.messageId)
      : null
  const automation =
    run?.automationId === undefined ? null : await ctx.db.get(run.automationId)
  const event =
    run?.reason.type === "event" ? await ctx.db.get(run.reason.eventId) : null
  const integration =
    message?.integrationId === undefined
      ? event?.integrationId === undefined
        ? null
        : await ctx.db.get(event.integrationId)
      : await ctx.db.get(message.integrationId)
  const approvalDeliveryIntegration =
    executionRequestedApproval?.delivery === undefined
      ? null
      : await ctx.db.get(executionRequestedApproval.delivery.integrationId)

  return {
    approval,
    approvalDeliveryIntegration,
    automation,
    event,
    integration,
    message,
    requestedApproval: executionRequestedApproval,
    run,
  }
}

async function getLatestRequestedApproval(
  ctx: QueryCtx,
  execution: Doc<"executions">
) {
  return await ctx.db
    .query("approvals")
    .withIndex("by_execution", (index) =>
      index.eq("executionId", execution._id)
    )
    .order("desc")
    .first()
}
