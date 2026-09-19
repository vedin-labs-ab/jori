import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { internalMutation } from "../../_generated/server"
import { meterFile } from "./meter"

/** Bounded, repeatable bootstrap; file writes use the same transaction marker. */
export const backfill = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("files")
      .paginate({ cursor: args.cursor ?? null, numItems: 100 })
    for (const file of page.page) {
      await meterFile(ctx, file)
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.files.capacity.reconcile.backfill,
        { cursor: page.continueCursor }
      )
    }
    return null
  },
})
