import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"

type MiloArtifactRequest = {
  tool: string
  args?: unknown
}

type SearchArtifactsArgs = {
  query?: string
  mimeType?: string
  limit?: number
}

type ReadArtifactArgs = {
  artifactId: Id<"artifacts">
}

const artifactTools = new Set(["search_artifacts", "read_artifact"])

export function isMiloArtifactTool(tool: string) {
  return artifactTools.has(tool)
}

export async function callMiloArtifactTool(
  ctx: ActionCtx,
  execution: {
    tenantId: string
  },
  request: MiloArtifactRequest
) {
  const args = normalizeToolArgs(request.args)

  if (request.tool === "search_artifacts") {
    return await ctx.runQuery(internal.artifacts.data.search, {
      ...(args as SearchArtifactsArgs),
      tenantId: execution.tenantId,
    })
  }

  if (request.tool === "read_artifact") {
    return await ctx.runQuery(internal.artifacts.data.read, {
      ...(args as ReadArtifactArgs),
      tenantId: execution.tenantId,
    })
  }

  throw new Error(`Unknown Milo artifact tool: ${request.tool}`)
}

function normalizeToolArgs(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return {}
  }

  return args
}
