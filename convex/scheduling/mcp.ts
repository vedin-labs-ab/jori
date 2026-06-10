import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { hashExecutionToken } from "../runs/tokens"

type MiloMcpRequest = {
  tool: string
  args?: unknown
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
  const token = getBearerToken(request)

  if (token === null) {
    return unauthorizedResponse()
  }

  const execution = await ctx.runQuery(
    internal.runs.executions.getActiveByHash,
    {
      hash: await hashExecutionToken(token),
    }
  )

  if (execution === null) {
    return unauthorizedResponse()
  }

  const body = (await request.json().catch(() => null)) as MiloMcpRequest | null

  if (body === null || typeof body.tool !== "string") {
    return jsonError("Invalid Milo MCP request", 400)
  }

  try {
    const result = await callMiloScheduleTool(ctx, execution, body)

    return Response.json(result)
  } catch (error) {
    return jsonError(formatMiloMcpError(error), 400)
  }
}

export async function callMiloScheduleTool(
  ctx: ActionCtx,
  execution: {
    tenantId: string
    createdByUserId?: string
  },
  request: MiloMcpRequest
) {
  const args = normalizeToolArgs(request.args)

  if (request.tool === "add_schedule") {
    return await ctx.runMutation(internal.scheduling.schedules.create, {
      ...(args as AddScheduleArgs),
      tenantId: execution.tenantId,
      createdByUserId: execution.createdByUserId,
    })
  }

  if (request.tool === "search_schedules") {
    return await ctx.runQuery(internal.scheduling.schedules.search, {
      ...(args as SearchSchedulesArgs),
      tenantId: execution.tenantId,
    })
  }

  if (request.tool === "read_schedule") {
    return await ctx.runQuery(internal.scheduling.schedules.read, {
      ...(args as ReadScheduleArgs),
      tenantId: execution.tenantId,
    })
  }

  if (request.tool === "update_schedule") {
    return await ctx.runMutation(internal.scheduling.schedules.update, {
      ...(args as UpdateScheduleArgs),
      tenantId: execution.tenantId,
    })
  }

  if (request.tool === "delete_schedule") {
    return await ctx.runMutation(internal.scheduling.schedules.remove, {
      ...(args as ReadScheduleArgs),
      tenantId: execution.tenantId,
    })
  }

  throw new Error(`Unknown Milo tool: ${request.tool}`)
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

  return args
}

function unauthorizedResponse() {
  return new Response("Unauthorized", { status: 401 })
}

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status })
}

function formatMiloMcpError(error: unknown) {
  return error instanceof Error ? error.message : "Milo MCP request failed"
}
