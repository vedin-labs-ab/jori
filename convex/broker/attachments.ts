import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import {
  formatProviderError,
  jsonError,
  unauthorizedResponse,
} from "../shared/http"
import { optionalString } from "../shared/input"
import { authenticateBrokerRequest } from "./auth"

export async function handleAttachmentUploadRequest(
  ctx: ActionCtx,
  request: Request
) {
  const context = await authenticateBrokerRequest(ctx, request)

  if (context === null) {
    return unauthorizedResponse()
  }

  const requestUrl = new URL(request.url)
  const bytes = new Uint8Array(await request.arrayBuffer())
  const maxAttachmentBytes = 25 * 1024 * 1024

  if (bytes.byteLength === 0) {
    return jsonError("Attachment is empty", 400)
  }

  if (bytes.byteLength > maxAttachmentBytes) {
    return jsonError("Attachment exceeds the 25 MB limit", 400)
  }

  const mimeType = normalizeMimeType(request.headers.get("content-type"))
  const name = normalizeAttachmentName(requestUrl.searchParams.get("name"))
  const description = optionalString(requestUrl.searchParams.get("description"))
  let storageId: Id<"_storage"> | undefined

  try {
    storageId = await ctx.storage.store(
      new Blob([bytes], {
        type: mimeType,
      })
    )

    const attachmentId: Id<"attachments"> = await ctx.runMutation(
      internal.attachments.data.record,
      {
        tenantId: context.run.tenantId,
        runId: context.run._id,
        storageId,
        name,
        mimeType,
        size: bytes.byteLength,
        description,
      }
    )
    const url = await ctx.storage.getUrl(storageId)

    return Response.json({
      attachmentId,
      name,
      mimeType,
      size: bytes.byteLength,
      url,
    })
  } catch (error) {
    if (storageId !== undefined) {
      await ctx.storage.delete(storageId)
    }

    return jsonError(
      formatProviderError(error, "Attachment upload failed"),
      400
    )
  }
}

function normalizeAttachmentName(value: string | null) {
  const name = value
    ?.trim()
    .split(/[\\/]/)
    .at(-1)
    ?.replace(/[\r\n]/g, " ")
    .slice(0, 160)

  return name === undefined || name === "" ? "attachment" : name
}

function normalizeMimeType(value: string | null) {
  const type = value?.split(";")[0]?.trim().toLowerCase()

  return type === undefined || type === "" ? "application/octet-stream" : type
}
