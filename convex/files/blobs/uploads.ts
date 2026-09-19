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

/** Claim once, retaining the key until cleanup after its URL expires. Deleting
 * a file can let that URL recreate its blob before then, without metadata. */
export async function claimUpload(ctx: MutationCtx, key: string) {
  const upload = await ctx.db
    .query("uploads")
    .withIndex("by_key", (index) => index.eq("key", key))
    .unique()
  if (upload === null || upload.createdAt <= Date.now() - uploadGraceMs) {
    throw new Error("Upload expired. Upload the file again.")
  }
  if (upload.claimed === true) {
    throw new Error("Upload already used. Upload the file again.")
  }
  await ctx.db.patch(upload._id, { claimed: true })
}
