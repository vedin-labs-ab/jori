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
  formatProviderError,
  jsonError,
  unauthorizedResponse,
} from "../shared/http"
import { requiredString } from "../shared/input"
import {
  type ApprovalBrokerContext,
  createPromptedToolApproval,
} from "./approval"
import { authenticateBrokerRequest } from "./auth"
import { listCapabilities } from "./capabilities"
import { normalizeBrokerToolInput } from "./input"
import { callJoriTool } from "./jori"
import { callProviderTool, createGitHubCloneCredentials } from "./tools"

type BrokerContext = ApprovalBrokerContext

export async function handleGitHubCloneCredentialsRequest(
  ctx: ActionCtx,
  request: Request
) {
  const context = await authenticateBrokerRequest(ctx, request)

  if (context === null) {
    return unauthorizedResponse()
  }

  const args = normalizeBrokerToolInput(
    "github_clone_repository",
    await request.json().catch(() => null)
  )
  authorizeTool(context, {
    surface: "github",
    tool: "github_clone_repository",
  })
  const integration = await authorizeSurfaceTool(context, {
    surface: "github",
    tool: "github_clone_repository",
  })

  if (integration === null) {
    return unauthorizedResponse()
  }

  try {
    return Response.json(
      createGitHubCloneCredentials({
        integration,
        owner: requiredString(args.owner, "owner"),
        repo: requiredString(args.repo, "repo"),
      }),
      {
        headers: {
          "cache-control": "no-store",
        },
      }
    )
  } catch (error) {
    return jsonError(
      formatProviderError(error, "GitHub clone credentials request failed"),
      400
    )
  }
}

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
  return await callProviderTool({
    ctx,
    integration: await prepareIntegrationForRuntime(ctx, { integration }),
    run: context.run,
    tool: request.tool,
    toolArgs: normalizeBrokerToolInput(request.tool, request.args),
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

function authorizeTool(
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

async function authorizeSurfaceTool(
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
