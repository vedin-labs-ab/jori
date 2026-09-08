import { type UploadedFile } from "../../contracts/runtime/files"
import { type RuntimeId } from "../../contracts/runtime/ids"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
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
  const storageId = await ctx.storage.store(
    new Blob([new Uint8Array(args.bytes)], { type: args.mimeType })
  )

  try {
    const url = await ctx.storage.getUrl(storageId)
    const fileId = await ctx.runMutation(internal.files.data.record, {
      mimeType: args.mimeType,
      name,
      organizationId: args.organizationId,
      runId: args.runId,
      size: args.bytes.byteLength,
      storageId,
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
    await ctx.storage.delete(storageId)
    throw error
  }
}
