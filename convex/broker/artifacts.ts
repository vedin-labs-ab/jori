import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { authenticateBrokerRequest } from "./mcp"
import {
  formatProviderError,
  jsonError,
  optionalString,
  unauthorizedResponse,
} from "./providers/common"

export async function handleArtifactUploadRequest(
  ctx: ActionCtx,
  request: Request
) {
  const context = await authenticateBrokerRequest(ctx, request)

  if (context === null) {
    return unauthorizedResponse()
  }

  const requestUrl = new URL(request.url)
  const bytes = new Uint8Array(await request.arrayBuffer())
  const maxArtifactBytes = 25 * 1024 * 1024

  if (bytes.byteLength === 0) {
    return jsonError("Artifact file is empty", 400)
  }

  if (bytes.byteLength > maxArtifactBytes) {
    return jsonError("Artifact file exceeds the 25 MB limit", 400)
  }

  const mimeType = normalizeMimeType(request.headers.get("content-type"))
  const name = normalizeArtifactName(requestUrl.searchParams.get("name"))
  const description = optionalString(requestUrl.searchParams.get("description"))
  let storageId: Id<"_storage"> | undefined

  try {
    storageId = await ctx.storage.store(
      new Blob([bytes], {
        type: mimeType,
      })
    )

    const artifactId: Id<"artifacts"> = await ctx.runMutation(
      internal.artifacts.data.record,
      {
        tenantId: context.execution.tenantId,
        executionId: context.execution._id,
        storageId,
        name,
        mimeType,
        size: bytes.byteLength,
        description,
      }
    )
    const url = await ctx.storage.getUrl(storageId)

    return Response.json({
      artifactId,
      name,
      mimeType,
      size: bytes.byteLength,
      url,
    })
  } catch (error) {
    if (storageId !== undefined) {
      await ctx.storage.delete(storageId)
    }

    return jsonError(formatProviderError(error, "Artifact upload failed"), 400)
  }
}

function normalizeArtifactName(value: string | null) {
  const name = value
    ?.trim()
    .split(/[\\/]/)
    .at(-1)
    ?.replace(/[\r\n]/g, " ")
    .slice(0, 160)

  return name === undefined || name === "" ? "artifact" : name
}

function normalizeMimeType(value: string | null) {
  const type = value?.split(";")[0]?.trim().toLowerCase()

  return type === undefined || type === "" ? "application/octet-stream" : type
}
