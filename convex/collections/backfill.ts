import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
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
 * Convex allows one paginated query per mutation, so this never paginates:
 * each invocation advances one keyset batch of one collection's documents
 * (the by_collection index ends on _creationTime, which orders the keyset)
 * and reschedules itself with the running count until every collection is
 * stamped. Finding the next unstamped collection scans the collections
 * table — acceptable for a one-shot, pre-launch tool slated for deletion.
 */

const documentBatchSize = 500

export const start = internalMutation({
  args: {
    collectionId: v.optional(v.id("collections")),
    after: v.optional(v.number()),
    counted: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const next = await backfillStep(ctx, args)

    if (next !== null) {
      await ctx.scheduler.runAfter(0, internal.collections.backfill.start, next)
    }

    return null
  },
})

export type BackfillStep = {
  collectionId?: Id<"collections">
  after?: number
  counted?: number
}

/** Advances the backfill by one bounded batch; returns the next step's
 *  arguments, or null when every collection is stamped. */
export async function backfillStep(
  ctx: MutationCtx,
  step: BackfillStep
): Promise<BackfillStep | null> {
  if (step.collectionId !== undefined) {
    const current = await ctx.db.get(step.collectionId)

    // A mid-count collection deleted underneath the backfill invalidates
    // the running count; restart fresh rather than stamping it elsewhere.
    if (current === null) {
      return {}
    }

    return await countBatch(ctx, current, step)
  }

  const target = await nextUnstamped(ctx)

  if (target === null) {
    return null
  }

  return await countBatch(ctx, target, step)
}

/** Counts one keyset batch of the target's documents; stamps the counter
 *  and returns a fresh step when the batch was the last one. */
async function countBatch(
  ctx: MutationCtx,
  target: Doc<"collections">,
  step: BackfillStep
): Promise<BackfillStep> {
  const documents = await ctx.db
    .query("documents")
    .withIndex("by_collection", (index) => {
      const scope = index.eq("collectionId", target._id)

      return step.after === undefined
        ? scope
        : scope.gt("_creationTime", step.after)
    })
    .take(documentBatchSize)
  const counted = (step.counted ?? 0) + documents.length

  if (documents.length < documentBatchSize) {
    await ctx.db.patch(target._id, { documentCount: counted })

    // A fresh step so the next invocation finds the next unstamped row.
    return {}
  }

  const last = documents[documents.length - 1]

  return {
    collectionId: target._id,
    after: last?._creationTime,
    counted,
  }
}

async function nextUnstamped(ctx: MutationCtx) {
  return await ctx.db
    .query("collections")
    .filter((filter) => filter.eq(filter.field("documentCount"), undefined))
    .first()
}
