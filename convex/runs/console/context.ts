import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { type RunToolSnapshot } from "../agent/tools/snapshot"
import { getRunOffers } from "./offers"

export async function getRunContext(
  ctx: QueryCtx,
  run: Doc<"runs">,
  requestedApproval: Doc<"approvals"> | undefined
) {
  const [runApprovals, activeWaiter, integrationOffers, parent] =
    await Promise.all([
      getRunApprovals(ctx, run),
      getActiveWaiter(ctx, run),
      getRunOffers(ctx, run),
      getParentRun(ctx, run),
    ])
  const runApproval = requestedApproval ?? runApprovals[0] ?? null
  const approvals = prioritizeApprovals(runApprovals, runApproval)
  const message =
    run.cause.type === "message" ? await ctx.db.get(run.cause.messageId) : null
  const automation =
    run.automation === undefined ? null : await ctx.db.get(run.automation.id)
  const event =
    run.cause.type === "event" ? await ctx.db.get(run.cause.eventId) : null
  const integration =
    message?.integrationId === undefined
      ? event?.integrationId === undefined
        ? null
        : await ctx.db.get(event.integrationId)
      : await ctx.db.get(message.integrationId)
  const approvalDeliveryIntegrations = await Promise.all(
    approvals.map((approval) =>
      approval.delivery === undefined
        ? null
        : ctx.db.get(approval.delivery.integrationId)
    )
  )

  return {
    activeWaiter,
    approvalDeliveryIntegrations,
    approvals,
    automation,
    event,
    integration,
    integrationOffers,
    message,
    parent,
    prepared: await getPreparedRun(ctx, run),
    requestedApproval: runApproval,
    run,
  }
}

async function getParentRun(ctx: QueryCtx, run: Doc<"runs">) {
  return run.parentId === undefined ? null : await ctx.db.get(run.parentId)
}

async function getRunApprovals(ctx: QueryCtx, run: Doc<"runs">) {
  return await ctx.db
    .query("approvals")
    .withIndex("by_run", (index) => index.eq("runId", run._id))
    .order("desc")
    .take(50)
}

function prioritizeApprovals(
  approvals: Doc<"approvals">[],
  primary: Doc<"approvals"> | null
) {
  if (primary === null) {
    return approvals
  }

  return [
    primary,
    ...approvals.filter((approval) => approval._id !== primary._id),
  ]
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
