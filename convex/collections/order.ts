import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"

// Documents carry a fractional `order` the grid sorts by: appends take a
// timestamp, anchored inserts take midpoints between their neighbors, so
// placing a document between two others never rewrites the rows around it.

type InsertPlacement = "above" | "below"

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
