import { type JsonObject } from "../../contracts/json"
import {
  canUseToolMode,
  getToolPermission,
  type PermissionMode,
  resolveToolMode,
  type ToolSurface,
} from "../../contracts/permissions"
import { isWebTool } from "../../contracts/permissions/web"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { prepareIntegrationForRuntime } from "../integrations/runtime"
import { canUseJobTool } from "../jobs/access"
import { findRunIntegration, inputAccess } from "../runs/agent/input"
import { toolExecutionType } from "../runs/agent/tools/policy"
import {
  type ApprovalBrokerContext,
  createPromptedToolApproval,
} from "./approval"
import { listCapabilities } from "./capabilities"
import { normalizeBrokerToolInput } from "./input"
import { callJoriTool } from "./jori"
import { callProviderTool } from "./tools"

type BrokerContext = ApprovalBrokerContext

type BrokerToolRequest = {
  surface: ToolSurface
  tool: string
  args: JsonObject
  replyTarget?: string
}

export async function callBrokerTool(
  ctx: ActionCtx,
  context: BrokerContext,
  request: BrokerToolRequest
): Promise<unknown> {
  if (request.surface === "jori") {
    const mode = authorizeTool(context, request)

    if (request.tool === "list_capabilities") {
      normalizeBrokerToolInput(request.tool, request.args)
      return listCapabilities(context)
    }

    if (mode === "prompted") {
      return await createPromptedToolApproval(ctx, context, request)
    }

    return await runJoriTool(ctx, context, request)
  }

  const mode = authorizeTool(context, request)
  const integration = await requireSurfaceIntegration(context, {
    surface: request.surface,
    tool: request.tool,
  })

  if (mode === "prompted") {
    return await createPromptedToolApproval(ctx, context, request)
  }

  return await runProviderTool(ctx, context, integration, request)
}

export async function executeApprovedTool(
  ctx: ActionCtx,
  context: BrokerContext,
  request: BrokerToolRequest
): Promise<unknown> {
  if (request.surface === "jori") {
    authorizeTool(context, request)

    return await runJoriTool(ctx, context, request)
  }

  authorizeTool(context, request)
  const integration = await requireSurfaceIntegration(context, {
    surface: request.surface,
    tool: request.tool,
  })

  return await runProviderTool(ctx, context, integration, request)
}

async function runJoriTool(
  ctx: ActionCtx,
  context: BrokerContext,
  request: BrokerToolRequest
) {
  return await callJoriTool(ctx, context, {
    tool: request.tool,
    args: normalizeBrokerToolInput(request.tool, request.args),
  })
}

async function runProviderTool(
  ctx: ActionCtx,
  context: BrokerContext,
  integration: Doc<"integrations">,
  request: BrokerToolRequest
) {
  const toolArgs = normalizeBrokerToolInput(request.tool, request.args)

  return await callProviderTool({
    ctx,
    integration: await prepareIntegrationForRuntime(ctx, { integration }),
    run: context.run,
    tool: request.tool,
    toolArgs,
  })
}

async function requireSurfaceIntegration(
  context: BrokerContext,
  request: {
    surface: Exclude<ToolSurface, "jori">
    tool: string
  }
) {
  const integration = await authorizeSurfaceTool(context, request)

  if (integration === null) {
    throw new Error(`No active ${request.surface} integration is available`)
  }

  return integration
}

export function authorizeTool(
  context: BrokerContext,
  request: {
    surface: ToolSurface
    tool: string
  }
): PermissionMode {
  const permission = getToolPermission(request.tool)

  if (permission === undefined || permission.surface !== request.surface) {
    throw new Error(`Unknown ${request.surface} tool: ${request.tool}`)
  }

  if (permission.route !== "broker") {
    throw new Error(`Unknown ${request.surface} tool: ${request.tool}`)
  }

  const mode = resolveToolMode(context.toolModes, request.tool)

  const executionType = toolExecutionType(context.input.type)

  if (!canUseToolMode(mode, executionType)) {
    if (mode === "prompted" && context.input.type === "job") {
      throw new Error(
        `Tool requires approval and cannot run in jobs: ${request.tool}`
      )
    }

    throw new Error(`Tool is blocked: ${request.tool}`)
  }

  const access = inputAccess(context.input)

  if (access !== undefined && isWebTool(request.tool) && !access.web) {
    throw new Error(`Tool is not allowed by run web access: ${request.tool}`)
  }

  return mode
}

export async function authorizeSurfaceTool(
  context: BrokerContext,
  request: {
    surface: Exclude<ToolSurface, "jori">
    tool: string
  }
) {
  const integration = findRunIntegration(context.input, request.surface)

  const access = inputAccess(context.input)

  if (integration !== null && access !== undefined) {
    const isSelected = canUseJobTool(access, integration._id, request.tool)

    if (!isSelected) {
      throw new Error(`Tool is not allowed by run access: ${request.tool}`)
    }
  }

  return integration
}
