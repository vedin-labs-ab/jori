import { v } from "convex/values"
import { internalMutation, type MutationCtx } from "../../_generated/server"

export const uploadGraceMs = 24 * 60 * 60 * 1000

/** Reserve before any bytes can arrive, including uploads that never sync
 * metadata or produce a file record. */
export async function reserveUpload(ctx: MutationCtx, organizationId: string) {
  const key = `${organizationId}/${crypto.randomUUID()}`
  await ctx.db.insert("uploads", { key, createdAt: Date.now() })
  return key
}

export const reserve = internalMutation({
  args: { organizationId: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => await reserveUpload(ctx, args.organizationId),
})

/** Consumed in the transaction that records the file. Cleanup and recording
 * therefore cannot both claim the same upload. */
export async function claimUpload(ctx: MutationCtx, key: string) {
  const upload = await ctx.db
    .query("uploads")
    .withIndex("by_key", (index) => index.eq("key", key))
    .unique()
  if (upload === null || upload.createdAt <= Date.now() - uploadGraceMs) {
    throw new Error("Upload expired. Upload the file again.")
  }
  await ctx.db.delete(upload._id)
}
