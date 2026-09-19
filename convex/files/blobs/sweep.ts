import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { internalMutation } from "../../_generated/server"
import { deleteBlob, linkedFile, listBlobs } from "./index"
import { uploadGraceMs } from "./uploads"

// A browser can finish an upload after its workspace closes, or never record
// it. Preserve every blob a file references, and give unrecorded uploads a
// day to complete before reclaiming them.
export const run = internalMutation({
  args: { cursor: v.optional(v.string()), cutoff: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const cutoff = args.cutoff ?? Date.now() - uploadGraceMs
    const uploads = await ctx.db
      .query("uploads")
      .withIndex("by_createdAt", (index) => index.lte("createdAt", cutoff))
      .take(50)
    for (const upload of uploads) {
      if ((await linkedFile(ctx, upload.key)) === null) {
        await deleteBlob(ctx, upload.key)
      }
      await ctx.db.delete(upload._id)
    }
    if (uploads.length === 50) {
      await ctx.scheduler.runAfter(0, internal.files.blobs.sweep.run, {
        ...args,
        cutoff,
      })
      return null
    }
    const batch = await listBlobs(ctx, args.cursor ?? null)
    for (const blob of batch.page) {
      if (
        Date.parse(blob.lastModified) <= cutoff &&
        (await linkedFile(ctx, blob.key)) === null
      ) {
        await deleteBlob(ctx, blob.key)
      }
    }
    if (!batch.isDone) {
      await ctx.scheduler.runAfter(0, internal.files.blobs.sweep.run, {
        cursor: batch.continueCursor,
        cutoff,
      })
    }
    return null
  },
})
