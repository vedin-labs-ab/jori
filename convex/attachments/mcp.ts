import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"

type MiloAttachmentRequest = {
  tool: string
  args?: unknown
}

type SearchAttachmentsArgs = {
  query?: string
  mimeType?: string
  limit?: number
}

type ReadAttachmentArgs = {
  attachmentId: Id<"attachments">
}

const attachmentTools = new Set(["search_attachments", "read_attachment"])

export function isMiloAttachmentTool(tool: string) {
  return attachmentTools.has(tool)
}

export async function callMiloAttachmentTool(
  ctx: ActionCtx,
  run: {
    tenantId: string
  },
  request: MiloAttachmentRequest
): Promise<unknown> {
  const args = normalizeToolArgs(request.args)

  if (request.tool === "search_attachments") {
    return await ctx.runQuery(internal.attachments.data.search, {
      ...(args as SearchAttachmentsArgs),
      tenantId: run.tenantId,
    })
  }

  if (request.tool === "read_attachment") {
    return await ctx.runQuery(internal.attachments.data.read, {
      ...(args as ReadAttachmentArgs),
      tenantId: run.tenantId,
    })
  }

  throw new Error(`Unknown Milo attachment tool: ${request.tool}`)
}

function normalizeToolArgs(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return {}
  }

  return args
}
