import { type ActionCtx } from "../_generated/server"
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
  },
  request: MiloToolRequest
) {
  if (isMiloFileTool(request.tool)) {
    return await callMiloFileTool(ctx, execution, request)
  }

  return await callMiloAutomationTool(ctx, execution, request)
}
