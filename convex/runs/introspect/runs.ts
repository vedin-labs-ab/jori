import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { normalizeRunId, normalizeRunIds } from "./ids"
import { type SearchRunsArgs } from "./schema"

const runScanLimit = 300

export type SearchRunArgs = Pick<
  SearchRunsArgs,
  "mode" | "parentId" | "rootId" | "runIds" | "scope"
>

export async function loadCandidateRuns(
  ctx: QueryCtx,
  current: Doc<"runs">,
  args: SearchRunArgs
) {
  switch (args.mode) {
    case "search":
      return await queryByScope(ctx, current, args.scope ?? "conversation")
    case "ids":
      return await loadKnownRuns(ctx, args.runIds)
    case "children":
      return await loadByParent(ctx, args.parentId)
    case "tree":
      return await loadByRoot(ctx, args.rootId)
  }
}

async function loadKnownRuns(ctx: QueryCtx, values: string[] | undefined) {
  const runIds = normalizeRunIds(ctx, values)

  return runIds === undefined ? [] : await loadRunIds(ctx, runIds)
}

async function loadByParent(ctx: QueryCtx, value: string | undefined) {
  const parentId = normalizeRunId(ctx, value)

  if (parentId === null) {
    return []
  }

  if (parentId !== undefined) {
    return await queryByParent(ctx, parentId)
  }

  return []
}

async function loadByRoot(ctx: QueryCtx, value: string | undefined) {
  const rootId = normalizeRunId(ctx, value)

  if (rootId === null) {
    return []
  }

  if (rootId !== undefined) {
    return await queryByRoot(ctx, rootId)
  }

  return []
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
  scope: "conversation" | "organization" | "all"
) {
  if (isOrganizationScope(current, scope)) {
    return await queryOrganizationRuns(ctx, current)
  }

  if (scope === "conversation") {
    return await queryConversationRuns(ctx, current)
  }

  return [
    ...(await queryOrganizationRuns(ctx, current)),
    ...(await queryPrivateRuns(ctx, current)),
  ]
}

function isOrganizationScope(
  current: Doc<"runs">,
  scope: "conversation" | "organization" | "all"
) {
  return (
    scope === "organization" ||
    (scope === "all" && current.audience === "organization")
  )
}

async function queryOrganizationRuns(ctx: QueryCtx, current: Doc<"runs">) {
  return await ctx.db
    .query("runs")
    .withIndex("by_organization_and_audience_and_created_at", (query) =>
      query
        .eq("organizationId", current.organizationId)
        .eq("audience", "organization")
    )
    .order("desc")
    .take(runScanLimit)
}

async function queryPrivateRuns(ctx: QueryCtx, current: Doc<"runs">) {
  if (current.audience === "conversation") {
    return await queryConversationRuns(ctx, current)
  }

  if (current.createdBy === undefined) {
    return []
  }

  return await ctx.db
    .query("runs")
    .withIndex("by_organization_and_created_by_and_created_at", (query) =>
      query
        .eq("organizationId", current.organizationId)
        .eq("createdBy", current.createdBy)
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
