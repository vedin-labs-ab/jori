import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import {
  type JoriToolRequest,
  optionalNumber,
  readRecord,
  requiredString,
} from "../shared/input"
import { type ResourceViewer } from "../visibility/resources"

type SearchFilesArgs = {
  query?: string
  mimeType?: string
  limit?: number
}

type ReadFileArgs = {
  fileId: Id<"files">
}

const fileTools = new Set(["search_files", "read_file", "share_file"])

export function isJoriFileTool(tool: string) {
  return fileTools.has(tool)
}

export async function callJoriFileTool(
  ctx: ActionCtx,
  viewer: ResourceViewer,
  request: JoriToolRequest
): Promise<unknown> {
  const args = readRecord(request.args)
  if (request.tool === "search_files") {
    return await ctx.runQuery(internal.files.data.search, {
      ...(args as SearchFilesArgs),
      ...viewer,
    })
  }

  if (request.tool === "read_file") {
    return await ctx.runQuery(internal.files.data.read, {
      ...(args as ReadFileArgs),
      ...viewer,
    })
  }

  if (request.tool === "share_file") {
    return await ctx.runMutation(internal.files.share.mint, {
      ...viewer,
      fileId: requiredString(args.fileId, "fileId") as Id<"files">,
      expiresInHours: optionalNumber(args.expiresInHours),
    })
  }

  throw new Error(`Unknown Jori file tool: ${request.tool}`)
}
