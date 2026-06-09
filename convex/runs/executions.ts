import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"

export const getInput = internalQuery({
  args: {
    executionId: v.id("executions"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId)

    if (execution === null) {
      return null
    }

    const trigger = await ctx.db.get(execution.triggerId)

    if (trigger === null || trigger.tenantId !== execution.tenantId) {
      return null
    }

    if (trigger.type === "message") {
      return await getMessageInput(ctx, { execution, trigger })
    }

    if (trigger.type === "scheduled") {
      return await getScheduledInput(ctx, { execution, trigger })
    }

    return null
  },
})

async function getMessageInput(
  ctx: QueryCtx,
  args: {
    execution: Doc<"executions">
    trigger: Doc<"triggers">
  }
) {
  if (args.trigger.messageId === undefined) {
    return null
  }

  const message = await ctx.db.get(args.trigger.messageId)

  if (message === null || message.tenantId !== args.execution.tenantId) {
    return null
  }

  const integration = await ctx.db.get(message.integrationId)

  if (
    integration === null ||
    integration.tenantId !== args.execution.tenantId ||
    !isMessageProvider(integration.provider)
  ) {
    return null
  }

  const integrations = await listActiveIntegrations(
    ctx,
    args.execution.tenantId
  )

  return {
    type: "message" as const,
    provider: integration.provider,
    execution: args.execution,
    trigger: args.trigger,
    message,
    integration,
    integrations,
  }
}

function isMessageProvider(
  provider: string
): provider is "linear" | "microsoft" | "slack" {
  return (
    provider === "linear" || provider === "microsoft" || provider === "slack"
  )
}

async function getScheduledInput(
  ctx: QueryCtx,
  args: {
    execution: Doc<"executions">
    trigger: Doc<"triggers">
  }
) {
  if (args.trigger.scheduleId === undefined) {
    return null
  }

  const schedule = await ctx.db.get(args.trigger.scheduleId)

  if (schedule === null || schedule.tenantId !== args.execution.tenantId) {
    return null
  }

  const integrations = await listActiveIntegrations(ctx, schedule.tenantId)
  const integration =
    integrations.find((candidate) => candidate.provider === "slack") ?? null

  return {
    type: "scheduled" as const,
    execution: args.execution,
    trigger: args.trigger,
    schedule,
    integration,
    integrations,
  }
}

async function listActiveIntegrations(ctx: QueryCtx, tenantId: string) {
  return await ctx.db
    .query("integrations")
    .withIndex("by_tenant_status", (query) =>
      query.eq("tenantId", tenantId).eq("status", "active")
    )
    .collect()
}

export const getActiveByHash = internalQuery({
  args: {
    hash: v.string(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("executions")
      .withIndex("by_hash", (query) => query.eq("hash", args.hash))
      .first()

    if (execution === null || execution.status !== "running") {
      return null
    }

    return execution
  },
})

export const markRunning = internalMutation({
  args: {
    executionId: v.id("executions"),
    sandboxId: v.optional(v.string()),
    hash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      status: "running",
      sandboxId: args.sandboxId,
      hash: args.hash,
    })
  },
})

export const finish = internalMutation({
  args: {
    tenantId: v.string(),
    executionId: v.id("executions"),
    fileId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    if (args.fileId !== undefined) {
      await ctx.db.insert("traces", {
        tenantId: args.tenantId,
        executionId: args.executionId,
        fileId: args.fileId,
        createdAt: Date.now(),
      })
    }

    await ctx.db.patch(args.executionId, {
      status: args.status,
      error: args.status === "failed" ? args.error : undefined,
      finishedAt: Date.now(),
      hash: undefined,
    })

    const activations = await ctx.db
      .query("activations")
      .withIndex("by_execution", (query) =>
        query.eq("executionId", args.executionId)
      )
      .collect()

    for (const activation of activations) {
      if (activation.executionId === args.executionId) {
        await ctx.db.patch(activation._id, { executionId: undefined })
      }
    }
  },
})
