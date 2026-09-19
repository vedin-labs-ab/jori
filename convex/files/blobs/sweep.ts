import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { internalMutation } from "../../_generated/server"
import { deleteBlob, linkedFile, listBlobs } from "./index"

const uploadGraceMs = 24 * 60 * 60 * 1000

// A browser can finish an upload after its workspace closes, or never record
// it. Preserve every blob a file references, and give unrecorded uploads a
// day to complete before reclaiming them.
export const run = internalMutation({
  args: { cursor: v.optional(v.string()), cutoff: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoff = args.cutoff ?? Date.now() - uploadGraceMs
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
  },
})
