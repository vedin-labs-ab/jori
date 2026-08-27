import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import {
  type ExecutionPrincipal,
  executionPrincipalPersonId,
} from "../runs/principal"
import {
  type JoriToolRequest,
  optionalNumber,
  readRecord,
  requiredString,
} from "../shared/input"

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

  if (request.tool === "share_file") {
    if (viewer.personId === undefined) {
      throw new Error("Sharing files requires an authenticated execution user.")
    }

    return await ctx.runMutation(internal.files.share.mint, {
      organizationId: viewer.organizationId,
      personId: viewer.personId,
      fileId: requiredString(args.fileId, "fileId") as Id<"files">,
      expiresInHours: optionalNumber(args.expiresInHours),
    })
  }

  throw new Error(`Unknown Jori file tool: ${request.tool}`)
}
