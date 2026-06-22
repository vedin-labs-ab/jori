import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { callMiloArtifactTool, isMiloArtifactTool } from "../artifacts/mcp"
import {
  callMiloAttachmentTool,
  isMiloAttachmentTool,
} from "../attachments/mcp"
import { callMiloAutomationTool } from "../automations/mcp"
import {
  callIntegrationSetupTool,
  isIntegrationSetupTool,
} from "../integrations/setup/mcp"
import { callMiloSkillTool, isMiloSkillTool } from "../skills/mcp"
import { type ApprovalBrokerContext } from "./approval"
import { callWebTool } from "./tools/web"

type MiloToolRequest = {
  tool: string
  args?: unknown
}

export async function callMiloTool(
  ctx: ActionCtx,
  context: ApprovalBrokerContext | MiloRunContext,
  request: MiloToolRequest
): Promise<unknown> {
  const run = isBrokerContext(context) ? context.run : context

  if (isIntegrationSetupTool(request.tool)) {
    if (!isBrokerContext(context)) {
      throw new Error("Integration setup links require broker context.")
    }

    return await callIntegrationSetupTool(ctx, context, request)
  }

  if (isMiloAttachmentTool(request.tool)) {
    return await callMiloAttachmentTool(ctx, run, request)
  }

  if (isMiloArtifactTool(request.tool)) {
    return await callMiloArtifactTool(ctx, toMiloContext(run), request)
  }

  if (request.tool === "web_search" || request.tool === "web_fetch") {
    return await callWebTool(request.tool, normalizeToolArgs(request.args))
  }

  if (isMiloSkillTool(request.tool)) {
    return callMiloSkillTool(request)
  }

  return await callMiloAutomationTool(ctx, toMiloContext(run), request)
}

type MiloRunContext = {
  tenantId: string
  createdBy?: string
  _id?: Id<"runs">
}

function toMiloContext(run: MiloRunContext) {
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

function isBrokerContext(
  context: ApprovalBrokerContext | MiloRunContext
): context is ApprovalBrokerContext {
  return "input" in context
}
