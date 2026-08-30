import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"

// Documents carry a fractional `order` the grid sorts by: appends take a
// timestamp, anchored inserts take midpoints between their neighbors, so
// placing a document between two others never rewrites the rows around it.

export type InsertPlacement = "above" | "below"

/** Where an insert lands relative to an existing document. */
export type InsertAnchor = {
  documentId: Id<"documents">
  placement: InsertPlacement
}

export const insertPlacementValidator = v.union(
  v.literal("above"),
  v.literal("below")
)

/** Ascending order values for `count` documents entering one collection:
 *  appended past the current maximum without an anchor, or packed between
 *  the anchor document and its neighbor on the anchored side. */
export async function resolveInsertOrders(
  ctx: MutationCtx,
  collectionId: Id<"collections">,
  count: number,
  anchor?: { document: Doc<"documents">; placement: InsertPlacement }
): Promise<number[]> {
  if (anchor === undefined) {
    const last = await lastByOrder(ctx, collectionId)

    return growingOrders(last?.order, count)
  }

  return await anchoredOrders(ctx, anchor.document, anchor.placement, count)
}

async function anchoredOrders(
  ctx: MutationCtx,
  anchor: Doc<"documents">,
  placement: InsertPlacement,
  count: number
) {
  const anchorOrder = anchor.order ?? anchor._creationTime

  if (placement === "below") {
    const next = await nextByOrder(ctx, anchor.collectionId, anchorOrder)

    return next?.order === undefined
      ? growingOrders(anchorOrder, count)
      : spreadBetween(anchorOrder, next.order, count)
  }

  const previous = await previousByOrder(ctx, anchor.collectionId, anchorOrder)
  // A missing neighbor order means nothing ordered sits below the anchor,
  // so any lower value keeps the insert directly above it.
  const lower = previous?.order ?? anchorOrder - count - 1

  return spreadBetween(lower, anchorOrder, count)
}

async function lastByOrder(ctx: MutationCtx, collectionId: Id<"collections">) {
  return await ctx.db
    .query("documents")
    .withIndex("by_collection_and_order", (index) =>
      index.eq("collectionId", collectionId)
    )
    .order("desc")
    .first()
}

async function nextByOrder(
  ctx: MutationCtx,
  collectionId: Id<"collections">,
  order: number
) {
  return await ctx.db
    .query("documents")
    .withIndex("by_collection_and_order", (index) =>
      index.eq("collectionId", collectionId).gt("order", order)
    )
    .first()
}

async function previousByOrder(
  ctx: MutationCtx,
  collectionId: Id<"collections">,
  order: number
) {
  return await ctx.db
    .query("documents")
    .withIndex("by_collection_and_order", (index) =>
      index.eq("collectionId", collectionId).lt("order", order)
    )
    .order("desc")
    .first()
}

/** Strictly growing append values: timestamps, nudged past any tie so
 *  batches inserted in one moment keep their given order. */
function growingOrders(previous: number | undefined, count: number) {
  const orders: number[] = []
  let last = previous

  for (let index = 0; index < count; index++) {
    const now = Date.now()

    last = last === undefined || now > last ? now : last + 1
    orders.push(last)
  }

  return orders
}

/** `count` evenly spaced values strictly between the two bounds. */
function spreadBetween(lower: number, upper: number, count: number) {
  const step = (upper - lower) / (count + 1)

  return Array.from({ length: count }, (_, index) => lower + step * (index + 1))
}

/**
 * TEMPORARY one-shot backfill: stamps `order = _creationTime` on every
 * document that predates the order field, so the ordered index reads whole
 * tables. New writes stamp `order` at the document write chokepoint
 * (collections/documents.ts).
 *
 * Run once per environment after deploying, then delete this mutation, its
 * step helper, and their tests in a follow-up commit:
 *
 *   node --experimental-strip-types scripts/env/index.ts --env dev \
 *     -- npx convex run collections/order:backfill
 *   node --experimental-strip-types scripts/env/index.ts --env prod \
 *     -- npx convex run collections/order:backfill
 *
 * Each invocation sweeps one keyset batch of the documents table (the
 * built-in by_creation_time index orders the keyset) and reschedules
 * itself until a batch comes up short.
 */
const backfillBatchSize = 500

export const backfill = internalMutation({
  args: { after: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const next = await backfillStep(ctx, args.after)

    if (next !== null) {
      await ctx.scheduler.runAfter(0, internal.collections.order.backfill, {
        after: next,
      })
    }

    return null
  },
})

/** Stamps one batch; returns the next step's keyset bound, or null when
 *  the sweep is complete. */
export async function backfillStep(
  ctx: MutationCtx,
  after: number | undefined
): Promise<number | null> {
  const documents = await ctx.db
    .query("documents")
    .withIndex("by_creation_time", (index) =>
      after === undefined ? index : index.gt("_creationTime", after)
    )
    .take(backfillBatchSize)

  for (const document of documents) {
    if (document.order === undefined) {
      await ctx.db.patch(document._id, { order: document._creationTime })
    }
  }

  const last = documents[documents.length - 1]

  return documents.length < backfillBatchSize || last === undefined
    ? null
    : last._creationTime
}
