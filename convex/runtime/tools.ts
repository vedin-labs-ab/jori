import { v } from "convex/values"
import { decodeJsonObject, encodeUnknownJson } from "../../contracts/json"
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
    argsJson: v.string(),
    runId: v.id("runs"),
    secret: v.string(),
    surface: toolSurfaceValidator,
    tool: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    const result = await callBrokerTool(
      ctx,
      await loadBrokerContext(ctx, args.runId),
      {
        approved: args.approved,
        args: decodeJsonObject(args.argsJson),
        surface: args.surface,
        tool: args.tool,
      }
    )

    return encodeUnknownJson(result)
  },
})

export const requestApproval = action({
  args: {
    argsJson: v.string(),
    runId: v.id("runs"),
    secret: v.string(),
    surface: toolSurfaceValidator,
    tool: v.string(),
    waitpointTokenId: v.string(),
  },
  returns: v.object({
    approvalId: v.id("approvals"),
    code: v.string(),
    instruction: v.string(),
    status: v.literal("approval_requested"),
  }),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    return await createPromptedToolApproval(
      ctx,
      await loadBrokerContext(ctx, args.runId),
      {
        args: decodeJsonObject(args.argsJson),
        surface: args.surface,
        tool: args.tool,
        waitpointTokenId: args.waitpointTokenId,
      }
    )
  },
})

async function loadBrokerContext(
  ctx: ActionCtx,
  runId: Doc<"runs">["_id"]
): Promise<ApprovalBrokerContext> {
  const run = await ctx.runQuery(internal.runs.records.get, {
    runId,
  })

  if (run === null) {
    throw new Error("Run not found.")
  }

  const input = await ctx.runQuery(internal.runs.records.getInputByRun, {
    runId: run._id,
  })

  if (input === null) {
    throw new Error("Run input not found.")
  }

  const overrides = await ctx.runQuery(
    internal.permissions.tools.listForRuntime,
    {
      tenantId: run.tenantId,
    }
  )
  const connectedIntegrations = await ctx.runQuery(
    internal.integrations.lookup.listActiveForRuntime,
    {
      tenantId: run.tenantId,
      ownerId: run.createdBy,
    }
  )
  const integrations: Doc<"integrations">[] = []

  for (const integration of input.integrations) {
    integrations.push(await prepareIntegrationForRuntime(ctx, { integration }))
  }

  return {
    connectedIntegrations,
    input,
    integrations,
    run,
    toolModes: resolveToolModes(overrides),
  }
}
