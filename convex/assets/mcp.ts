import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { type MiloToolRequest, readRecord } from "../shared/input"

type SearchAssetsArgs = {
  query?: string
  mimeType?: string
  limit?: number
}

type ReadAssetArgs = {
  assetId: Id<"assets">
}

const assetTools = new Set(["search_assets", "read_asset"])

export function isMiloAssetTool(tool: string) {
  return assetTools.has(tool)
}

export async function callMiloAssetTool(
  ctx: ActionCtx,
  run: {
    tenantId: string
  },
  request: MiloToolRequest
): Promise<unknown> {
  const args = readRecord(request.args)

  if (request.tool === "search_assets") {
    return await ctx.runQuery(internal.assets.data.search, {
      ...(args as SearchAssetsArgs),
      tenantId: run.tenantId,
    })
  }

  if (request.tool === "read_asset") {
    return await ctx.runQuery(internal.assets.data.read, {
      ...(args as ReadAssetArgs),
      tenantId: run.tenantId,
    })
  }

  throw new Error(`Unknown Milo asset tool: ${request.tool}`)
}
