import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { callMiloArtifactTool, isMiloArtifactTool } from "../artifacts/mcp"
import {
  callMiloAttachmentTool,
  isMiloAttachmentTool,
} from "../attachments/mcp"
import { callMiloAutomationTool } from "../automations/mcp"
import { callWebTool } from "./tools/web"

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
  if (isMiloAttachmentTool(request.tool)) {
    return await callMiloAttachmentTool(ctx, run, request)
  }

  if (isMiloArtifactTool(request.tool)) {
    return await callMiloArtifactTool(ctx, toMiloContext(run), request)
  }

  if (request.tool === "web_search" || request.tool === "web_fetch") {
    return await callWebTool(request.tool, normalizeToolArgs(request.args))
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

function normalizeToolArgs(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return {}
  }

  return args as Record<string, unknown>
}
