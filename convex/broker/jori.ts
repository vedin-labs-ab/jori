import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import {
  cancelApprovalRequest,
  isCancelApprovalTool,
} from "../approvals/cancel"
import { callJoriFileTool, isJoriFileTool } from "../files/mcp"
import {
  callIntegrationOfferTool,
  cancelIntegrationOffer,
  isCancelIntegrationOfferTool,
  isIntegrationOfferTool,
} from "../integrations/offers/mcp"
import { tryDeliverSlackIntegrationOffer } from "../integrations/slack/offers/delivery"
import { callJoriJobTool } from "../jobs/mcp"
import {
  callRunIntrospectionTool,
  isRunIntrospectionTool,
} from "../runs/introspect/mcp"
import {
  type ExecutionPrincipal,
  executionPrincipalPersonId,
} from "../runs/principal"
import { type JoriToolRequest, readRecord } from "../shared/input"
import { callJoriSkillTool, isJoriSkillTool } from "../skills/mcp"
import { callJoriStoreTool, isJoriStoreTool } from "../stores/mcp"
import { callJoriTableTool, isJoriTableTool } from "../tables/mcp"
import { callWorkstreamTool, isWorkstreamTool } from "../workstreams/mcp"
import { type ApprovalBrokerContext } from "./approval"
import { callWebTool } from "./tools/web"

export async function callJoriTool(
  ctx: ActionCtx,
  context: ApprovalBrokerContext | JoriRunContext,
  request: JoriToolRequest
): Promise<unknown> {
  if (isBrokerScopedJoriTool(request.tool)) {
    return await callBrokerScopedJoriTool(
      ctx,
      requireBrokerContext(context),
      request
    )
  }

  const run = isBrokerContext(context) ? context.run : context
  const viewer = {
    organizationId: run.organizationId,
    personId: executionPrincipalPersonId(run.principal),
    runId: run._id,
  }

  if (isJoriFileTool(request.tool)) {
    return await callJoriFileTool(ctx, viewer, request)
  }

  if (isJoriTableTool(request.tool)) {
    return await callJoriTableTool(ctx, viewer, request)
  }

  if (isJoriStoreTool(request.tool)) {
    return await callJoriStoreTool(ctx, viewer, request)
  }

  if (request.tool === "web_search" || request.tool === "web_fetch") {
    return await callWebTool(request.tool, readRecord(request.args))
  }

  if (isJoriSkillTool(request.tool)) {
    return await callJoriSkillTool(ctx, run, request)
  }

  if (isRunIntrospectionTool(request.tool)) {
    return await callRunIntrospectionTool(ctx, run, request)
  }

  if (isWorkstreamTool(request.tool)) {
    return await callWorkstreamTool(ctx, run, request)
  }

  return await callJoriJobTool(
    ctx,
    {
      ...viewer,
      job: run.job && {
        id: run.job.parentId ?? run.job.id,
        version: run.job.version,
      },
    },
    request
  )
}

function isBrokerScopedJoriTool(tool: string) {
  return (
    isIntegrationOfferTool(tool) ||
    isCancelApprovalTool(tool) ||
    isCancelIntegrationOfferTool(tool)
  )
}

async function callBrokerScopedJoriTool(
  ctx: ActionCtx,
  context: ApprovalBrokerContext,
  request: JoriToolRequest
) {
  if (isIntegrationOfferTool(request.tool)) {
    return await callIntegrationOfferTool(
      ctx,
      context,
      request,
      tryDeliverSlackIntegrationOffer
    )
  }

  if (isCancelApprovalTool(request.tool)) {
    return await cancelApprovalRequest(ctx, context.run, request.args)
  }

  return await cancelIntegrationOffer(ctx, context.run, request.args)
}

function requireBrokerContext(
  context: ApprovalBrokerContext | JoriRunContext
): ApprovalBrokerContext {
  if (!isBrokerContext(context)) {
    throw new Error("This tool requires an interactive run.")
  }

  return context
}

type JoriRunContext = {
  organizationId: string
  principal: ExecutionPrincipal
  _id?: Id<"runs">
  job?: {
    id: Id<"jobs">
    parentId?: Id<"jobs">
    version?: number
  }
}

function isBrokerContext(
  context: ApprovalBrokerContext | JoriRunContext
): context is ApprovalBrokerContext {
  return "input" in context
}
