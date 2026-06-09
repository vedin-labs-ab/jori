import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import {
  getToolPermission,
  resolveToolMode,
  resolveToolModes,
  type ToolProvider,
} from "../permissions/catalog"
import { prepareIntegrationForRuntime } from "../runs/integrations"
import { hashExecutionToken } from "../runs/tokens"
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

type BrokerContext = {
  execution: Doc<"executions">
  integrations: Doc<"integrations">[]
  toolModes: ReadonlyMap<string, ReturnType<typeof resolveToolMode>>
}

type SlackOutput = {
  type: "slack"
  channelId: string
  threadId?: string
}

type ScheduleSpec =
  | { type: "oneShot"; runAt: string }
  | { type: "recurring"; cron: string }

type AddScheduleArgs = {
  name: string
  description: string
  metadata?: unknown
  output: SlackOutput
  schedule: ScheduleSpec
}

type SearchSchedulesArgs = {
  query?: string
  includeCompleted?: boolean
  limit?: number
}

type ReadScheduleArgs = {
  scheduleId: Id<"schedules">
}

type UpdateScheduleArgs = {
  scheduleId: Id<"schedules">
  name?: string
  description?: string
  metadata?: unknown
  output?: SlackOutput
  schedule?: ScheduleSpec
}

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

async function authenticateBrokerRequest(ctx: ActionCtx, request: Request) {
  const token = getBearerToken(request)

  if (token === null) {
    return null
  }

  const execution = await ctx.runQuery(
    internal.runs.executions.getActiveByHash,
    {
      hash: await hashExecutionToken(token),
    }
  )

  if (execution === null) {
    return null
  }

  const input = await ctx.runQuery(internal.runs.executions.getInputByTrigger, {
    triggerId: execution.triggerId,
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
    authorizeTool(context, request)
    return await callScheduleTool(ctx, context, request.tool, request.args)
  }

  const integration = await authorizeProviderTool(context, request)

  if (integration === null) {
    throw new Error(`No active ${request.provider} integration is available`)
  }

  return await callProviderTool({
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
) {
  const permission = getToolPermission(request.tool)

  if (permission === undefined || permission.provider !== request.provider) {
    throw new Error(`Unknown ${request.provider} tool: ${request.tool}`)
  }

  if (resolveToolMode(context.toolModes, request.tool) === "blocked") {
    throw new Error(`Tool is blocked: ${request.tool}`)
  }
}

async function authorizeProviderTool(
  context: BrokerContext,
  request: {
    provider: ToolProvider
    tool: string
  }
) {
  authorizeTool(context, request)

  return (
    context.integrations.find(
      (integration) =>
        integration.status === "active" &&
        integration.provider === request.provider
    ) ?? null
  )
}

async function callScheduleTool(
  ctx: ActionCtx,
  context: BrokerContext,
  tool: string,
  args: Record<string, unknown>
) {
  if (tool === "add_schedule") {
    return await ctx.runMutation(internal.scheduling.schedules.create, {
      ...(args as AddScheduleArgs),
      tenantId: context.execution.tenantId,
      createdBy: context.execution.createdBy,
    })
  }

  if (tool === "search_schedules") {
    return await ctx.runQuery(internal.scheduling.schedules.search, {
      ...(args as SearchSchedulesArgs),
      tenantId: context.execution.tenantId,
    })
  }

  if (tool === "read_schedule") {
    return await ctx.runQuery(internal.scheduling.schedules.read, {
      ...(args as ReadScheduleArgs),
      tenantId: context.execution.tenantId,
    })
  }

  if (tool === "update_schedule") {
    return await ctx.runMutation(internal.scheduling.schedules.update, {
      ...(args as UpdateScheduleArgs),
      tenantId: context.execution.tenantId,
    })
  }

  if (tool === "delete_schedule") {
    return await ctx.runMutation(internal.scheduling.schedules.remove, {
      ...(args as ReadScheduleArgs),
      tenantId: context.execution.tenantId,
    })
  }

  throw new Error(`Unknown Milo tool: ${tool}`)
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
