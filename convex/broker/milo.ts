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
  run: {
    tenantId: string
    createdBy?: string
    _id?: Id<"runs">
  },
  request: MiloToolRequest
): Promise<unknown> {
  if (isMiloFileTool(request.tool)) {
    return await callMiloFileTool(ctx, run, request)
  }

  if (isMiloArtifactTool(request.tool)) {
    return await callMiloArtifactTool(ctx, toMiloContext(run), request)
  }

  return await callMiloAutomationTool(ctx, toMiloContext(run), request)
}

function toMiloContext(run: {
  tenantId: string
  createdBy?: string
  _id?: Id<"runs">
}) {
  return {
    tenantId: run.tenantId,
    createdBy: run.createdBy,
    runId: run._id,
  }
}
