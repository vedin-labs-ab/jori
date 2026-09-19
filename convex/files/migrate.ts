import { v } from "convex/values"
import { internalAction, internalMutation } from "../_generated/server"
import { bytesToHex } from "../shared/encoding"
import { readBlob, storeBlob } from "./blobs"

// TEMPORARY, for the move out of Convex file storage: run once per
// deployment by the operator, then delete this module. File rows are
// re-imported with their ids and the `blobKey` that `copy` returns.

/** Copies one Convex-stored blob into the bucket and proves the copy by
 *  checksum. The source stays until `empty` runs. */
export const copy = internalAction({
  args: {
    storageId: v.id("_storage"),
    organizationId: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const source = await ctx.storage.get(args.storageId)
    if (source === null) {
      throw new Error("The stored file is missing.")
    }
    const bytes = new Uint8Array(await source.arrayBuffer())
    const blobKey = await storeBlob(ctx, { ...args, bytes })
    const copied = await readBlob(blobKey)
    if (
      copied === null ||
      (await digest(bytes)) !==
        (await digest(new Uint8Array(await copied.arrayBuffer())))
    ) {
      throw new Error("The copy does not match its source.")
    }
    return { blobKey, size: bytes.byteLength }
  },
})

/** Deletes every blob left in Convex file storage, a page at a time.
 *  Returns whether more remain. */
export const empty = internalMutation({
  args: {},
  handler: async (ctx) => {
    const blobs = await ctx.db.system.query("_storage").take(100)
    for (const blob of blobs) {
      await ctx.storage.delete(blob._id)
    }
    return blobs.length === 100
  },
})

async function digest(bytes: Uint8Array<ArrayBuffer>) {
  return bytesToHex(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
  )
}
