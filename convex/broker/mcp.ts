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
import { optionalString, requiredString } from "../shared/input"
import {
  type ApprovalBrokerContext,
  createPromptedToolApproval,
} from "./approval"
import { authenticateBrokerRequest } from "./auth"
import { listCapabilities } from "./capabilities"
import { callMiloTool } from "./milo"
import { callProviderTool, fetchGitHubTarball } from "./tools"

type BrokerContext = ApprovalBrokerContext

export async function handleGitHubTarballRequest(
  ctx: ActionCtx,
  request: Request
) {
  const context = await authenticateBrokerRequest(ctx, request)

  if (context === null) {
    return unauthorizedResponse()
  }

  const args = normalizeToolArgs(await request.json().catch(() => null))
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
    return await fetchGitHubTarball({
      integration,
      owner: requiredString(args.owner, "owner"),
      repo: requiredString(args.repo, "repo"),
      ref: optionalString(args.ref),
    })
  } catch (error) {
    return jsonError(
      formatProviderError(error, "GitHub tarball request failed"),
      400
    )
  }
}

export async function callBrokerTool(
  ctx: ActionCtx,
  context: BrokerContext,
  request: {
    approved?: boolean
    surface: ToolSurface
    tool: string
    args: Record<string, unknown>
    waitpointTokenId?: string
  }
): Promise<unknown> {
  if (request.surface === "milo") {
    const { mode } = authorizeTool(context, request)

    if (request.tool === "list_capabilities") {
      return listCapabilities(context)
    }

    if (mode === "prompted" && request.approved !== true) {
      return await createPromptedToolApproval(ctx, context, request)
    }

    return await callMiloTool(ctx, context.run, request)
  }

  const surface = request.surface
  const { mode, permission } = authorizeTool(context, request)
  const integration = await authorizeSurfaceTool(context, {
    permission,
    surface,
    tool: request.tool,
  })

  if (integration === null) {
    throw new Error(`No active ${request.surface} integration is available`)
  }

  if (mode === "prompted" && request.approved !== true) {
    return await createPromptedToolApproval(ctx, context, request)
  }

  return await callProviderTool({
    ctx,
    integration,
    run: context.run,
    tool: request.tool,
    toolArgs: request.args,
  })
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

function normalizeToolArgs(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return {}
  }

  return args as Record<string, unknown>
}
