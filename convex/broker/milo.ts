import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { callMiloArtifactTool, isMiloArtifactTool } from "../artifacts/mcp"
import { callMiloAutomationTool } from "../automations/mcp"
import { callMiloFileTool, isMiloFileTool } from "../files/mcp"

type MiloToolRequest = {
  tool: string
  args?: unknown
}

export async function callMiloTool(
  ctx: ActionCtx,
  execution: {
    tenantId: string
    createdBy?: string
    runId?: Id<"runs">
  },
  request: MiloToolRequest
) {
  if (isMiloFileTool(request.tool)) {
    return await callMiloFileTool(ctx, execution, request)
  }

  if (isMiloArtifactTool(request.tool)) {
    return await callMiloArtifactTool(ctx, execution, request)
  }

  return await callMiloAutomationTool(ctx, execution, request)
}
