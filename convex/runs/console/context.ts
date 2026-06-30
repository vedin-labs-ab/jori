import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { type RunToolSnapshot } from "../agent/tools/snapshot"

export async function getRunContext(
  ctx: QueryCtx,
  run: Doc<"runs">,
  requestedApproval: Doc<"approvals"> | undefined
) {
  const [runApproval, activeWaiter] = await Promise.all([
    requestedApproval ?? getLatestRequestedApproval(ctx, run),
    getActiveWaiter(ctx, run),
  ])
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
    activeWaiter,
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

async function getActiveWaiter(ctx: QueryCtx, run: Doc<"runs">) {
  if (run.status !== "running") {
    return null
  }

  return await ctx.db
    .query("waiters")
    .withIndex("by_run_and_status", (index) =>
      index.eq("runId", run._id).eq("status", "waiting")
    )
    .first()
}

async function getPreparedRun(ctx: QueryCtx, run: Doc<"runs">) {
  const prepared = await ctx.db
    .query("traces")
    .withIndex("by_key", (index) => index.eq("key", `run:${run._id}:prepared`))
    .first()

  return {
    tools: readPreparedTools(prepared),
  }
}

function readPreparedTools(
  prepared: Doc<"traces"> | null
): RunToolSnapshot | undefined {
  if (prepared?.type !== "run.prepared") {
    return undefined
  }

  return isToolSnapshot(prepared.data.tools) ? prepared.data.tools : undefined
}

function isToolSnapshot(value: unknown): value is RunToolSnapshot {
  if (typeof value !== "object" || value === null) {
    return false
  }

  return "groups" in value && "webSearch" in value
}
