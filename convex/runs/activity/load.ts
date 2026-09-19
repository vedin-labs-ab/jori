import { isRecord } from "../../../contracts/json"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { optionalString } from "../../shared/input"
import { createSight, type Sight } from "../../visibility/sight"
import { activityFileIds, activityMaterialId } from "./metadata/materials"
import { type ActivityData } from "./types"

const traceLimit = 500
const relationLimit = 100

export async function loadActivityData(
  ctx: QueryCtx,
  run: Doc<"runs">,
  personId: Id<"persons"> | undefined,
  sight: Sight = createSight(ctx, {
    organizationId: run.organizationId,
    personId,
  })
): Promise<ActivityData> {
  const [traces, approvals, offers, waiters, agents, files] = await Promise.all(
    [
      loadTraces(ctx, run._id),
      loadApprovals(ctx, run._id),
      loadOffers(ctx, run._id),
      loadWaiters(ctx, run._id),
      loadAgents(ctx, run._id),
      loadFiles(ctx, run._id, sight),
    ]
  )
  const [collections, touched] = await Promise.all([
    loadCollections(ctx, traces, sight),
    loadTouchedFiles(ctx, traces, sight),
  ])

  return {
    agents,
    approvals,
    collections,
    files,
    touched,
    offers,
    run,
    traces,
    waiters,
  }
}

/** Loads the tables and stores the run's tool calls referenced, keeping
 *  only those the viewer may see. */
async function loadCollections(
  ctx: QueryCtx,
  traces: Doc<"traces">[],
  sight: Sight
) {
  const references = toolCalls(traces).map(({ tool, input }) =>
    activityMaterialId(tool, input)
  )

  const ids = referencedIds(ctx, "collections", references)

  return await visible(
    await Promise.all(ids.map((id) => ctx.db.get(id))),
    sight
  )
}

/** Loads the files the run's tool calls read, shared, or sent, keeping only
 *  those the viewer may see. */
async function loadTouchedFiles(
  ctx: QueryCtx,
  traces: Doc<"traces">[],
  sight: Sight
) {
  const references = toolCalls(traces).flatMap(({ tool, input }) =>
    activityFileIds(tool, input)
  )

  const ids = referencedIds(ctx, "files", references)

  return await visible(
    await Promise.all(ids.map((id) => ctx.db.get(id))),
    sight
  )
}

function toolCalls(traces: Doc<"traces">[]) {
  return traces
    .filter(
      (trace) => trace.type === "tool.started" || trace.type === "tool.failed"
    )
    .map((trace) => ({
      tool: optionalString(trace.data.tool.name),
      input: isRecord(trace.data.input) ? trace.data.input : undefined,
    }))
}

function referencedIds<Table extends "collections" | "files">(
  ctx: QueryCtx,
  table: Table,
  references: Array<string | undefined>
) {
  const ids = new Set<Id<Table>>()

  for (const reference of references) {
    const id =
      reference === undefined ? null : ctx.db.normalizeId(table, reference)

    if (id !== null && ids.size < relationLimit) {
      ids.add(id)
    }
  }

  return [...ids]
}

async function visible<Material extends Parameters<Sight["canSee"]>[0]>(
  materials: Array<Material | null>,
  sight: Sight
) {
  const seen: Material[] = []

  for (const material of materials) {
    if (material !== null && (await sight.canSee(material))) {
      seen.push(material)
    }
  }

  return seen
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

/** A run's saved files, minus any later restricted away from the viewer. */
async function loadFiles(ctx: QueryCtx, runId: Id<"runs">, sight: Sight) {
  const files = await ctx.db
    .query("files")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .order("asc")
    .take(relationLimit)

  return await visible(files, sight)
}
