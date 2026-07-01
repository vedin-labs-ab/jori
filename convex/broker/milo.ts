import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import {
  cancelApprovalRequest,
  isCancelApprovalTool,
} from "../approvals/cancel"
import { callMiloArtifactTool, isMiloArtifactTool } from "../artifacts/mcp"
import { callMiloAssetTool, isMiloAssetTool } from "../assets/mcp"
import { callMiloAutomationTool } from "../automations/mcp"
import {
  callIntegrationOfferTool,
  cancelIntegrationOffer,
  isCancelIntegrationOfferTool,
  isIntegrationOfferTool,
} from "../integrations/offers/mcp"
import {
  callRunIntrospectionTool,
  isRunIntrospectionTool,
} from "../runs/introspect/mcp"
import { readRecord } from "../shared/input"
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

  if (isMiloAssetTool(request.tool)) {
    return await callMiloAssetTool(ctx, run, request)
  }

  if (isMiloArtifactTool(request.tool)) {
    return await callMiloArtifactTool(ctx, toMiloContext(run), request)
  }

  if (request.tool === "web_search" || request.tool === "web_fetch") {
    return await callWebTool(request.tool, readRecord(request.args))
  }

  if (isMiloSkillTool(request.tool)) {
    return await callMiloSkillTool(ctx, run, request)
  }

  if (isRunIntrospectionTool(request.tool)) {
    return await callRunIntrospectionTool(ctx, run, request)
  }

  return await callMiloAutomationTool(ctx, toMiloContext(run), request)
}

function isBrokerScopedMiloTool(tool: string) {
  return (
    isIntegrationOfferTool(tool) ||
    isCancelApprovalTool(tool) ||
    isCancelIntegrationOfferTool(tool)
  )
}

async function callBrokerScopedMiloTool(
  ctx: ActionCtx,
  context: ApprovalBrokerContext,
  request: MiloToolRequest
) {
  if (isIntegrationOfferTool(request.tool)) {
    return await callIntegrationOfferTool(ctx, context, request)
  }

  if (isCancelApprovalTool(request.tool)) {
    return await cancelApprovalRequest(ctx, context.run, request.args)
  }

  return await cancelIntegrationOffer(ctx, context.run, request.args)
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
  createdBy?: Id<"persons">
  _id?: Id<"runs">
}

function toMiloContext(run: MiloRunContext) {
  return {
    tenantId: run.tenantId,
    createdBy: run.createdBy,
    runId: run._id,
  }
}

function isBrokerContext(
  context: ApprovalBrokerContext | MiloRunContext
): context is ApprovalBrokerContext {
  return "input" in context
}
