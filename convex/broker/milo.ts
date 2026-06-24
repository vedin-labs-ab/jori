import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import {
  cancelApprovalRequest,
  isCancelApprovalTool,
} from "../approvals/cancel"
import { callMiloArtifactTool, isMiloArtifactTool } from "../artifacts/mcp"
import {
  callMiloAttachmentTool,
  isMiloAttachmentTool,
} from "../attachments/mcp"
import { callMiloAutomationTool } from "../automations/mcp"
import {
  callIntegrationSetupTool,
  cancelConnectionOffer,
  isCancelConnectionOfferTool,
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
  if (isBrokerScopedMiloTool(request.tool)) {
    return await callBrokerScopedMiloTool(
      ctx,
      requireBrokerContext(context),
      request
    )
  }

  const run = isBrokerContext(context) ? context.run : context

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

function isBrokerScopedMiloTool(tool: string) {
  return (
    isIntegrationSetupTool(tool) ||
    isCancelApprovalTool(tool) ||
    isCancelConnectionOfferTool(tool)
  )
}

async function callBrokerScopedMiloTool(
  ctx: ActionCtx,
  context: ApprovalBrokerContext,
  request: MiloToolRequest
) {
  if (isIntegrationSetupTool(request.tool)) {
    return await callIntegrationSetupTool(ctx, context, request)
  }

  if (isCancelApprovalTool(request.tool)) {
    return await cancelApprovalRequest(ctx, context.run, request.args)
  }

  return await cancelConnectionOffer(ctx, context.run, request.args)
}

function requireBrokerContext(
  context: ApprovalBrokerContext | MiloRunContext
): ApprovalBrokerContext {
  if (!isBrokerContext(context)) {
    throw new Error("This tool requires an interactive run.")
  }

  return context
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
