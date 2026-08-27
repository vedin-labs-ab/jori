import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import {
  type ExecutionPrincipal,
  executionPrincipalPersonId,
} from "../runs/principal"
import { type JoriToolRequest, readRecord } from "../shared/input"

type SearchFilesArgs = {
  query?: string
  mimeType?: string
  limit?: number
}

type ReadFileArgs = {
  fileId: Id<"files">
}

const fileTools = new Set(["search_files", "read_file"])

export function isJoriFileTool(tool: string) {
  return fileTools.has(tool)
}

export async function callJoriFileTool(
  ctx: ActionCtx,
  run: {
    organizationId: string
    principal: ExecutionPrincipal
  },
  request: JoriToolRequest
): Promise<unknown> {
  const args = readRecord(request.args)
  const viewer = {
    organizationId: run.organizationId,
    personId: executionPrincipalPersonId(run.principal),
  }

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

  throw new Error(`Unknown Jori file tool: ${request.tool}`)
}
