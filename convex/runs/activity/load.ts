import { isRecord } from "../../../contracts/json"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { optionalString } from "../../shared/input"
import { createSight, type Sight } from "../../visibility/sight"
import { activityMaterialId } from "./metadata/materials"
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
  const collections = await loadCollections(ctx, traces, sight)

  return {
    agents,
    approvals,
    collections,
    files,
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
  const ids = new Set<Id<"collections">>()
  const toolTraces = traces.filter(
    (trace) => trace.type === "tool.started" || trace.type === "tool.failed"
  )

  for (const trace of toolTraces) {
    const reference = activityMaterialId(
      optionalString(trace.data.tool.name),
      isRecord(trace.data.input) ? trace.data.input : undefined
    )
    const id =
      reference === undefined
        ? null
        : ctx.db.normalizeId("collections", reference)

    if (id !== null) {
      ids.add(id)
    }

    if (ids.size >= relationLimit) {
      break
    }
  }

  const collections = await Promise.all([...ids].map((id) => ctx.db.get(id)))
  const visible: Doc<"collections">[] = []

  for (const collection of collections) {
    if (collection !== null && (await sight.canSee(collection))) {
      visible.push(collection)
    }
  }

  return visible
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
  const visible: Doc<"files">[] = []

  for (const file of files) {
    if (await sight.canSee(file)) {
      visible.push(file)
    }
  }

  return visible
}
