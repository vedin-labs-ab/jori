import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { type RunToolSnapshot } from "../agent/tools/snapshot"

export async function getRunContext(
  ctx: QueryCtx,
  run: Doc<"runs">,
  requestedApproval: Doc<"approvals"> | undefined
) {
  const runApproval =
    requestedApproval ?? (await getLatestRequestedApproval(ctx, run))
  const message =
    run.cause.type === "message" ? await ctx.db.get(run.cause.messageId) : null
  const automation =
    run.automationId === undefined ? null : await ctx.db.get(run.automationId)
  const event =
    run.cause.type === "event" ? await ctx.db.get(run.cause.eventId) : null
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
    prepared: await getPreparedRun(ctx, run),
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

async function getPreparedRun(ctx: QueryCtx, run: Doc<"runs">) {
  const logs = await ctx.db
    .query("logs")
    .withIndex("by_run", (index) => index.eq("runId", run._id))
    .order("desc")
    .take(25)
  const prepared = logs.find((log) => log.type === "run.prepared")

  return {
    tools: readToolSnapshot(prepared?.payload),
  }
}

function readToolSnapshot(payload: unknown): RunToolSnapshot | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const tools = "tools" in payload ? payload.tools : undefined

  return isToolSnapshot(tools) ? tools : undefined
}

function isToolSnapshot(value: unknown): value is RunToolSnapshot {
  if (typeof value !== "object" || value === null) {
    return false
  }

  return "groups" in value && "webSearch" in value
}
