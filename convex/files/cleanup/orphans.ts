import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { internalMutation } from "../../_generated/server"

const uploadGraceMs = 24 * 60 * 60 * 1000

// A browser can finish an upload after its workspace closes, or never register
// it. Only files owns blobs in this deployment. Preserve every referenced blob
// and give unregistered uploads a day to complete before reclaiming them.
export const sweep = internalMutation({
  args: { cursor: v.optional(v.string()), cutoff: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoff = args.cutoff ?? Date.now() - uploadGraceMs
    const batch = await ctx.db.system
      .query("_storage")
      .order("asc")
      .paginate({
        cursor: args.cursor ?? null,
        numItems: 50,
      })
    for (const blob of batch.page) {
      if (blob._creationTime > cutoff) {
        return
      }
      const referenced = await ctx.db
        .query("files")
        .withIndex("by_storageId", (q) => q.eq("storageId", blob._id))
        .first()
      if (referenced === null) {
        await ctx.storage.delete(blob._id)
      }
    }
    if (!batch.isDone) {
      await ctx.scheduler.runAfter(0, internal.files.cleanup.orphans.sweep, {
        cursor: batch.continueCursor,
        cutoff,
      })
    }
  },
})
