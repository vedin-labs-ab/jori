import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx, action } from "../_generated/server"
import {
  type ApprovalBrokerContext,
  createPromptedToolApproval,
} from "../broker/approval"
import { callBrokerTool } from "../broker/mcp"
import { prepareIntegrationForRuntime } from "../integrations/runtime"
import { resolveToolModes } from "../permissions/catalog"
import { toolSurfaceValidator } from "../shared/integrations"
import { requireWorkerSecret } from "./shared"

export const call = action({
  args: {
    approved: v.optional(v.boolean()),
    args: v.any(),
    executionId: v.id("executions"),
    secret: v.string(),
    surface: toolSurfaceValidator,
    tool: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    return await callBrokerTool(
      ctx,
      await loadBrokerContext(ctx, args.executionId),
      {
        approved: args.approved,
        args: normalizeToolArgs(args.args),
        surface: args.surface,
        tool: args.tool,
      }
    )
  },
})

export const requestApproval = action({
  args: {
    args: v.any(),
    executionId: v.id("executions"),
    secret: v.string(),
    surface: toolSurfaceValidator,
    tool: v.string(),
    waitpointTokenId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    return await createPromptedToolApproval(
      ctx,
      await loadBrokerContext(ctx, args.executionId),
      {
        args: normalizeToolArgs(args.args),
        surface: args.surface,
        tool: args.tool,
        waitpointTokenId: args.waitpointTokenId,
      }
    )
  },
})

async function loadBrokerContext(
  ctx: ActionCtx,
  executionId: Doc<"executions">["_id"]
): Promise<ApprovalBrokerContext> {
  const execution = await ctx.runQuery(internal.executions.records.get, {
    executionId,
  })

  if (execution === null) {
    throw new Error("Execution not found.")
  }

  const input = await ctx.runQuery(internal.executions.records.getInputByRun, {
    runId: execution.runId,
  })

  if (input === null) {
    throw new Error("Run input not found.")
  }

  const overrides = await ctx.runQuery(
    internal.permissions.tools.listForRuntime,
    {
      tenantId: execution.tenantId,
    }
  )
  const connectedIntegrations = await ctx.runQuery(
    internal.integrations.lookup.listActiveForRuntime,
    {
      tenantId: execution.tenantId,
      ownerId: execution.createdBy,
    }
  )
  const integrations: Doc<"integrations">[] = []

  for (const integration of input.integrations) {
    integrations.push(await prepareIntegrationForRuntime(ctx, { integration }))
  }

  return {
    connectedIntegrations,
    execution,
    input,
    integrations,
    toolModes: resolveToolModes(overrides),
  }
}

function normalizeToolArgs(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return {}
  }

  return args as Record<string, unknown>
}
