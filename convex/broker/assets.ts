import { assetTooLargeError, maxAssetBytes } from "../../contracts/runtime"
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

export async function handleAssetUploadRequest(
  ctx: ActionCtx,
  request: Request
) {
  const context = await authenticateBrokerRequest(ctx, request)

  if (context === null) {
    return unauthorizedResponse()
  }

  const requestUrl = new URL(request.url)
  const bytes = new Uint8Array(await request.arrayBuffer())

  if (bytes.byteLength === 0) {
    return jsonError("Asset is empty", 400)
  }

  if (bytes.byteLength > maxAssetBytes) {
    return jsonError(assetTooLargeError, 400)
  }

  const mimeType = normalizeMimeType(request.headers.get("content-type"))
  const name = normalizeAssetName(requestUrl.searchParams.get("name"))
  const description = optionalString(requestUrl.searchParams.get("description"))
  let storageId: Id<"_storage"> | undefined

  try {
    storageId = await ctx.storage.store(
      new Blob([bytes], {
        type: mimeType,
      })
    )

    const assetId: Id<"assets"> = await ctx.runMutation(
      internal.assets.data.record,
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
      assetId,
      name,
      mimeType,
      size: bytes.byteLength,
      url,
    })
  } catch (error) {
    if (storageId !== undefined) {
      await ctx.storage.delete(storageId)
    }

    return jsonError(formatProviderError(error, "Asset upload failed"), 400)
  }
}

function normalizeAssetName(value: string | null) {
  const name = value
    ?.trim()
    .split(/[\\/]/)
    .at(-1)
    ?.replace(/[\r\n]/g, " ")
    .slice(0, 160)

  return name === undefined || name === "" ? "asset" : name
}

function normalizeMimeType(value: string | null) {
  const type = value?.split(";")[0]?.trim().toLowerCase()

  return type === undefined || type === "" ? "application/octet-stream" : type
}
