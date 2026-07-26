import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { type JoriToolRequest, readRecord } from "../shared/input"

type SearchAssetsArgs = {
  query?: string
  mimeType?: string
  limit?: number
}

type ReadAssetArgs = {
  assetId: Id<"assets">
}

const assetTools = new Set(["search_assets", "read_asset"])

export function isJoriAssetTool(tool: string) {
  return assetTools.has(tool)
}

export async function callJoriAssetTool(
  ctx: ActionCtx,
  run: {
    organizationId: string
  },
  request: JoriToolRequest
): Promise<unknown> {
  const args = readRecord(request.args)

  if (request.tool === "search_assets") {
    return await ctx.runQuery(internal.assets.data.search, {
      ...(args as SearchAssetsArgs),
      organizationId: run.organizationId,
    })
  }

  if (request.tool === "read_asset") {
    return await ctx.runQuery(internal.assets.data.read, {
      ...(args as ReadAssetArgs),
      organizationId: run.organizationId,
    })
  }

  throw new Error(`Unknown Jori asset tool: ${request.tool}`)
}
