import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { hashExecutionToken } from "../executions/tokens"
import { prepareIntegrationForRuntime } from "../integrations/runtime"
import {
  getToolPermission,
  type PermissionMode,
  resolveToolMode,
  resolveToolModes,
  type ToolProvider,
} from "../permissions/catalog"
import {
  type ApprovalBrokerContext,
  createPromptedToolApproval,
} from "./approval"
import { callMiloTool } from "./milo"
import { callProviderTool, fetchGitHubTarball } from "./providers"
import {
  formatProviderError,
  jsonError,
  optionalString,
  requiredString,
  unauthorizedResponse,
} from "./providers/common"

type MiloMcpRequest = {
  provider?: ToolProvider
  tool: string
  args?: unknown
}

type BrokerContext = ApprovalBrokerContext

export async function handleMiloMcpRequest(ctx: ActionCtx, request: Request) {
  const context = await authenticateBrokerRequest(ctx, request)

  if (context === null) {
    return unauthorizedResponse()
  }

  const body = (await request.json().catch(() => null)) as MiloMcpRequest | null

  if (body === null || typeof body.tool !== "string") {
    return jsonError("Invalid Milo MCP request", 400)
  }

  try {
    const result = await callBrokerTool(ctx, context, {
      provider: body.provider ?? "milo",
      tool: body.tool,
      args: normalizeToolArgs(body.args),
    })

    return Response.json(result)
  } catch (error) {
    return jsonError(formatProviderError(error, "Milo MCP request failed"), 400)
  }
}

export async function handleGitHubTarballRequest(
  ctx: ActionCtx,
  request: Request
) {
  const context = await authenticateBrokerRequest(ctx, request)

  if (context === null) {
    return unauthorizedResponse()
  }

  const args = normalizeToolArgs(await request.json().catch(() => null))
  const integration = await authorizeProviderTool(context, {
    provider: "github",
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
    return jsonError(formatProviderError(error, "Milo MCP request failed"), 400)
  }
}

export async function authenticateBrokerRequest(
  ctx: ActionCtx,
  request: Request
) {
  const token = getBearerToken(request)

  if (token === null) {
    return null
  }

  const execution = await ctx.runQuery(
    internal.executions.records.getActiveByHash,
    {
      hash: await hashExecutionToken(token),
    }
  )

  if (execution === null) {
    return null
  }

  const input = await ctx.runQuery(internal.executions.records.getInputByRun, {
    runId: execution.runId,
  })

  if (input === null) {
    return null
  }

  const permissions = await ctx.runQuery(
    internal.permissions.tools.listForRuntime,
    {
      tenantId: execution.tenantId,
    }
  )
  const integrations: Doc<"integrations">[] = []

  for (const integration of input.integrations) {
    integrations.push(await prepareIntegrationForRuntime(ctx, { integration }))
  }

  return {
    execution,
    input,
    integrations,
    toolModes: resolveToolModes(permissions),
  } satisfies BrokerContext
}

async function callBrokerTool(
  ctx: ActionCtx,
  context: BrokerContext,
  request: {
    provider: ToolProvider
    tool: string
    args: Record<string, unknown>
  }
) {
  if (request.provider === "milo") {
    const mode = authorizeTool(context, request)

    if (mode === "prompted") {
      return await createPromptedToolApproval(ctx, context, request)
    }

    return await callMiloTool(ctx, context.execution, request)
  }

  const provider = request.provider
  const mode = authorizeTool(context, request)
  const integration = await authorizeProviderTool(context, {
    provider,
    tool: request.tool,
  })

  if (integration === null) {
    throw new Error(`No active ${request.provider} integration is available`)
  }

  if (mode === "prompted") {
    return await createPromptedToolApproval(ctx, context, request)
  }

  return await callProviderTool({
    ctx,
    execution: context.execution,
    integration,
    tool: request.tool,
    toolArgs: request.args,
  })
}

function authorizeTool(
  context: BrokerContext,
  request: {
    provider: ToolProvider
    tool: string
  }
): PermissionMode {
  const permission = getToolPermission(request.tool)

  if (permission === undefined || permission.provider !== request.provider) {
    throw new Error(`Unknown ${request.provider} tool: ${request.tool}`)
  }

  const mode = resolveToolMode(context.toolModes, request.tool)

  if (mode === "blocked") {
    throw new Error(`Tool is blocked: ${request.tool}`)
  }

  return mode
}

async function authorizeProviderTool(
  context: BrokerContext,
  request: {
    provider: Exclude<ToolProvider, "milo">
    tool: string
  }
) {
  authorizeTool(context, request)

  return findProviderIntegration(context, request.provider)
}

function findProviderIntegration(
  context: BrokerContext,
  provider: Exclude<ToolProvider, "milo">
) {
  return (
    context.integrations.find(
      (integration) =>
        integration.status === "active" && integration.provider === provider
    ) ?? null
  )
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")

  if (authorization === null || !authorization.startsWith("Bearer ")) {
    return null
  }

  const token = authorization.slice("Bearer ".length).trim()

  return token === "" ? null : token
}

function normalizeToolArgs(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return {}
  }

  return args as Record<string, unknown>
}
