import { type JsonObject } from "../../contracts/json"
import { isWebTool } from "../../contracts/permissions/web"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { canUseAutomationTool } from "../automations/access"
import {
  canUseToolMode,
  getToolPermission,
  type PermissionMode,
  resolveToolMode,
  type ToolPermission,
  type ToolSurface,
} from "../permissions/catalog"
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
import { normalizeBrokerToolInput, normalizeMiloToolInput } from "./input"
import { callMiloTool } from "./milo"
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
  const { permission } = authorizeTool(context, {
    surface: "github",
    tool: "github_clone_repository",
  })
  const integration = await authorizeSurfaceTool(context, {
    permission,
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
  if (request.surface === "milo") {
    const { mode } = authorizeTool(context, request)

    if (request.tool === "list_capabilities") {
      return listCapabilities(context)
    }

    if (mode === "prompted") {
      return await createPromptedToolApproval(ctx, context, request)
    }

    return await runMiloTool(ctx, context, request)
  }

  const { mode, permission } = authorizeTool(context, request)
  const integration = await requireSurfaceIntegration(context, {
    permission,
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
  if (request.surface === "milo") {
    authorizeTool(context, request)

    return await runMiloTool(ctx, context, request)
  }

  const { permission } = authorizeTool(context, request)
  const integration = await requireSurfaceIntegration(context, {
    permission,
    surface: request.surface,
    tool: request.tool,
  })

  return await runProviderTool(ctx, context, integration, request)
}

async function runMiloTool(
  ctx: ActionCtx,
  context: BrokerContext,
  request: BrokerToolRequest
) {
  return await callMiloTool(ctx, context, {
    tool: request.tool,
    args: normalizeMiloToolInput(request.tool, request.args),
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
    integration,
    run: context.run,
    tool: request.tool,
    toolArgs: normalizeBrokerToolInput(request.tool, request.args),
  })
}

async function requireSurfaceIntegration(
  context: BrokerContext,
  request: {
    permission: ToolPermission
    surface: Exclude<ToolSurface, "milo">
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
): {
  mode: PermissionMode
  permission: ToolPermission
} {
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
    if (mode === "prompted" && context.input.type === "automation") {
      throw new Error(
        `Tool requires approval and cannot run in automations: ${request.tool}`
      )
    }

    throw new Error(`Tool is blocked: ${request.tool}`)
  }

  if (
    context.input.type === "automation" &&
    isWebTool(request.tool) &&
    !context.input.automation.access.web
  ) {
    throw new Error(
      `Tool is not allowed by automation web access: ${request.tool}`
    )
  }

  return { mode, permission }
}

async function authorizeSurfaceTool(
  context: BrokerContext,
  request: {
    permission: ToolPermission
    surface: Exclude<ToolSurface, "milo">
    tool: string
  }
) {
  const integration = findSurfaceIntegration(context, request.surface)

  if (integration !== null && context.input.type === "automation") {
    const isSelected = canUseAutomationTool(
      context.input.automation.access,
      integration._id,
      request.tool
    )

    if (!isSelected) {
      throw new Error(
        `Tool is not allowed by automation access: ${request.tool}`
      )
    }
  }

  return integration
}

function findSurfaceIntegration(
  context: BrokerContext,
  surface: Exclude<ToolSurface, "milo">
) {
  return (
    context.integrations.find(
      (integration) =>
        integration.status === "active" && integration.integration === surface
    ) ?? null
  )
}
