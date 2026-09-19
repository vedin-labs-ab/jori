import { type UploadedFile } from "../../contracts/runtime/files"
import { type RuntimeId } from "../../contracts/runtime/ids"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { blobUrl, deleteBlob, storeBlob } from "./blobs"
import { normalizeFileName } from "./names"

/** Store and record in the calling deployment. Failed records leave no blob. */
export async function uploadRunFile(
  ctx: ActionCtx,
  args: {
    bytes: Uint8Array
    mimeType: string
    name: string
    organizationId: string
    runId: Id<"runs">
  }
): Promise<UploadedFile> {
  const name = normalizeFileName(args.name)
  const blobKey = await storeBlob(ctx, args)

  try {
    const url = await blobUrl(blobKey)
    const fileId = await ctx.runMutation(internal.files.data.record, {
      mimeType: args.mimeType,
      name,
      organizationId: args.organizationId,
      runId: args.runId,
      size: args.bytes.byteLength,
      blobKey,
      visibility: { mode: "organization" },
    })

    return {
      fileId: fileId as RuntimeId<"files">,
      mimeType: args.mimeType,
      name,
      size: args.bytes.byteLength,
      url,
    }
  } catch (error) {
    await deleteBlob(ctx, blobKey)
    throw error
  }
}
