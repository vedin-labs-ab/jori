import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"

/** New records cannot claim a blob already linked to any workspace. */
export async function requireUnusedUpload(
  ctx: MutationCtx,
  storageId: Id<"_storage">
) {
  const metadata = await ctx.db.system.get(storageId)
  if (metadata === null) {
    throw new Error("Uploaded file was not found in storage")
  }
  if ((await linkedFile(ctx, storageId)) !== null) {
    throw new Error("Uploaded file is already in use")
  }
  return metadata
}

/** Unlink the caller's row first, in the same mutation. Legacy records may
 * share a blob, so keep it until its last reference has been removed. */
export async function deleteUnusedBlob(
  ctx: MutationCtx,
  storageId: Id<"_storage">
) {
  if ((await linkedFile(ctx, storageId)) === null) {
    await ctx.storage.delete(storageId)
  }
}

async function linkedFile(ctx: MutationCtx, storageId: Id<"_storage">) {
  return await ctx.db
    .query("files")
    .withIndex("by_storageId", (index) => index.eq("storageId", storageId))
    .first()
}
