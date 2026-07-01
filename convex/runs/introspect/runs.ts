import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"

const runScanLimit = 300

export type SearchRunArgs = {
  parentId?: Id<"runs">
  rootId?: Id<"runs">
  runIds?: Id<"runs">[]
  scope?: "conversation" | "tenant" | "all"
}

export async function loadCandidateRuns(
  ctx: QueryCtx,
  current: Doc<"runs">,
  args: SearchRunArgs
) {
  if (args.runIds !== undefined) {
    return await loadRunIds(ctx, args.runIds)
  }

  if (args.parentId !== undefined) {
    return await queryByParent(ctx, args.parentId)
  }

  if (args.rootId !== undefined) {
    return await queryByRoot(ctx, args.rootId)
  }

  return await queryByScope(ctx, current, args.scope ?? "conversation")
}

async function loadRunIds(ctx: QueryCtx, runIds: Id<"runs">[]) {
  const runs = await Promise.all(
    runIds.map(async (runId) => await ctx.db.get(runId))
  )

  return runs.filter((run): run is Doc<"runs"> => run !== null)
}

async function queryByParent(ctx: QueryCtx, parentId: Id<"runs">) {
  return await ctx.db
    .query("runs")
    .withIndex("by_parent", (query) => query.eq("parentId", parentId))
    .order("desc")
    .take(runScanLimit)
}

async function queryByRoot(ctx: QueryCtx, rootId: Id<"runs">) {
  return await ctx.db
    .query("runs")
    .withIndex("by_root", (query) => query.eq("rootId", rootId))
    .order("desc")
    .take(runScanLimit)
}

async function queryByScope(
  ctx: QueryCtx,
  current: Doc<"runs">,
  scope: "conversation" | "tenant" | "all"
) {
  if (isTenantScope(current, scope)) {
    return await queryTenantRuns(ctx, current)
  }

  if (scope === "conversation") {
    return await queryConversationRuns(ctx, current)
  }

  return uniqueRuns([
    ...(await queryTenantRuns(ctx, current)),
    ...(await queryPrivateRuns(ctx, current)),
  ])
}

function isTenantScope(
  current: Doc<"runs">,
  scope: "conversation" | "tenant" | "all"
) {
  return (
    scope === "tenant" ||
    (scope === "all" && current.audienceScope === "tenant")
  )
}

async function queryTenantRuns(ctx: QueryCtx, current: Doc<"runs">) {
  return await ctx.db
    .query("runs")
    .withIndex("by_tenant_and_audience_scope_and_created_at", (query) =>
      query.eq("tenantId", current.tenantId).eq("audienceScope", "tenant")
    )
    .order("desc")
    .take(runScanLimit)
}

async function queryPrivateRuns(ctx: QueryCtx, current: Doc<"runs">) {
  if (current.audienceScope === "conversation") {
    return await queryConversationRuns(ctx, current)
  }

  if (current.createdBy === undefined) {
    return []
  }

  return await ctx.db
    .query("runs")
    .withIndex("by_tenant_and_created_by_and_created_at", (query) =>
      query.eq("tenantId", current.tenantId).eq("createdBy", current.createdBy)
    )
    .order("desc")
    .take(runScanLimit)
}

async function queryConversationRuns(ctx: QueryCtx, current: Doc<"runs">) {
  if (current.conversationId === undefined) {
    return []
  }

  return await ctx.db
    .query("runs")
    .withIndex("by_conversation_and_created_at", (query) =>
      query.eq("conversationId", current.conversationId)
    )
    .order("desc")
    .take(runScanLimit)
}

export function uniqueRuns(runs: Doc<"runs">[]) {
  const seen = new Set<Id<"runs">>()
  const unique: Doc<"runs">[] = []

  for (const run of runs) {
    if (!seen.has(run._id)) {
      seen.add(run._id)
      unique.push(run)
    }
  }

  return unique
}
