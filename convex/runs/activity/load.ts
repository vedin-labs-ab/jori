import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { type ActivityData } from "./types"

const traceLimit = 500
const relationLimit = 100

export async function loadActivityData(
  ctx: QueryCtx,
  run: Doc<"runs">
): Promise<ActivityData> {
  const [traces, approvals, offers, waiters, agents, assets] =
    await Promise.all([
      loadTraces(ctx, run._id),
      loadApprovals(ctx, run._id),
      loadOffers(ctx, run._id),
      loadWaiters(ctx, run._id),
      loadAgents(ctx, run._id),
      loadAssets(ctx, run._id),
    ])

  return {
    agents,
    approvals,
    assets,
    offers,
    run,
    traces,
    waiters,
  }
}

async function loadTraces(ctx: QueryCtx, runId: Id<"runs">) {
  const traces = await ctx.db
    .query("traces")
    .withIndex("by_run_and_timestamp", (query) => query.eq("runId", runId))
    .order("desc")
    .take(traceLimit)

  return traces.reverse()
}

async function loadApprovals(ctx: QueryCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("approvals")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .order("asc")
    .take(relationLimit)
}

async function loadOffers(ctx: QueryCtx, runId: Id<"runs">) {
  const statuses = [
    "pending",
    "claimed",
    "cancelled",
    "connected",
    "failed",
    "expired",
  ] as const
  const groups = await Promise.all(
    statuses.map((status) =>
      ctx.db
        .query("integrationOffers")
        .withIndex("by_run_and_status", (query) =>
          query.eq("runId", runId).eq("status", status)
        )
        .take(relationLimit)
    )
  )

  return groups.flat().sort((left, right) => left.createdAt - right.createdAt)
}

async function loadWaiters(ctx: QueryCtx, runId: Id<"runs">) {
  const statuses = ["waiting", "woken", "cancelled", "expired"] as const
  const groups = await Promise.all(
    statuses.map((status) =>
      ctx.db
        .query("waiters")
        .withIndex("by_run_and_status", (query) =>
          query.eq("runId", runId).eq("status", status)
        )
        .take(relationLimit)
    )
  )

  return groups.flat().sort((left, right) => left.createdAt - right.createdAt)
}

async function loadAgents(ctx: QueryCtx, parentId: Id<"runs">) {
  return await ctx.db
    .query("runs")
    .withIndex("by_parent", (query) => query.eq("parentId", parentId))
    .order("asc")
    .take(relationLimit)
}

async function loadAssets(ctx: QueryCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("assets")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .order("asc")
    .take(relationLimit)
}
