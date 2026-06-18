import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"

type MiloFileRequest = {
  tool: string
  args?: unknown
}

type SearchFilesArgs = {
  query?: string
  mimeType?: string
  limit?: number
}

type ReadFileArgs = {
  fileId: Id<"files">
}

const fileTools = new Set(["search_files", "read_file"])

export function isMiloFileTool(tool: string) {
  return fileTools.has(tool)
}

export async function callMiloFileTool(
  ctx: ActionCtx,
  execution: {
    tenantId: string
  },
  request: MiloFileRequest
): Promise<unknown> {
  const args = normalizeToolArgs(request.args)

  if (request.tool === "search_files") {
    return await ctx.runQuery(internal.files.data.search, {
      ...(args as SearchFilesArgs),
      tenantId: execution.tenantId,
    })
  }

  if (request.tool === "read_file") {
    return await ctx.runQuery(internal.files.data.read, {
      ...(args as ReadFileArgs),
      tenantId: execution.tenantId,
    })
  }

  throw new Error(`Unknown Milo file tool: ${request.tool}`)
}

function normalizeToolArgs(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return {}
  }

  return args
}
