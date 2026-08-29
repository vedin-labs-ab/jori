import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"

/**
 * One-shot backfill of `documentCount` for collections that predate the
 * denormalized counter. New writes maintain the counter at the document
 * write chokepoint; this stamps every existing row once.
 *
 * Run once per environment after deploying the counter, then delete this
 * module in a follow-up commit once both environments are stamped:
 *
 *   node --experimental-strip-types scripts/env/index.ts --env dev \
 *     -- npx convex run collections/backfill:start
 *   node --experimental-strip-types scripts/env/index.ts --env prod \
 *     -- npx convex run collections/backfill:start
 *
 * Collections are pre-launch small, so one batch counts a handful of them
 * per transaction and reschedules itself until every page is stamped.
 */

const collectionBatchSize = 10

export const start = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const continueCursor = await backfillBatch(ctx, args.cursor ?? null)

    if (continueCursor !== null) {
      await ctx.scheduler.runAfter(0, internal.collections.backfill.start, {
        cursor: continueCursor,
      })
    }

    return null
  },
})

/** Stamps one page of collections; returns the cursor to continue from, or
 *  null when every collection is counted. */
export async function backfillBatch(
  ctx: MutationCtx,
  cursor: string | null
): Promise<string | null> {
  const page = await ctx.db
    .query("collections")
    .paginate({ numItems: collectionBatchSize, cursor })

  for (const collection of page.page) {
    await ctx.db.patch(collection._id, {
      documentCount: await countDocuments(ctx, collection._id),
    })
  }

  return page.isDone ? null : page.continueCursor
}

async function countDocuments(
  ctx: MutationCtx,
  collectionId: Id<"collections">
) {
  let count = 0
  let cursor: string | null = null

  for (;;) {
    const page = await ctx.db
      .query("documents")
      .withIndex("by_collection", (index) =>
        index.eq("collectionId", collectionId)
      )
      .paginate({ numItems: 500, cursor })

    count += page.page.length

    if (page.isDone) {
      return count
    }

    cursor = page.continueCursor
  }
}
