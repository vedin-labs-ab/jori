import { type ActionCtx } from "../_generated/server"
import { callMiloArtifactTool, isMiloArtifactTool } from "../artifacts/mcp"
import { callMiloScheduleTool } from "../scheduling/mcp"

type MiloToolRequest = {
  tool: string
  args?: unknown
}

export async function callMiloTool(
  ctx: ActionCtx,
  execution: {
    tenantId: string
    createdBy?: string
  },
  request: MiloToolRequest
) {
  if (isMiloArtifactTool(request.tool)) {
    return await callMiloArtifactTool(ctx, execution, request)
  }

  return await callMiloScheduleTool(ctx, execution, request)
}
