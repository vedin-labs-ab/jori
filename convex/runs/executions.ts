import { v } from "convex/values"
import { internalMutation, internalQuery } from "../_generated/server"

export const getInput = internalQuery({
  args: {
    executionId: v.id("executions"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId)
    const message = await ctx.db.get(args.messageId)

    if (execution === null || message === null) {
      return null
    }

    const integration = await ctx.db.get(message.integrationId)

    if (integration === null) {
      return null
    }

    return { execution, message, integration }
  },
})

export const getScheduledInput = internalQuery({
  args: {
    executionId: v.id("executions"),
    scheduleId: v.id("schedules"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId)
    const schedule = await ctx.db.get(args.scheduleId)

    if (execution === null || schedule === null) {
      return null
    }

    if (execution.tenantId !== schedule.tenantId) {
      return null
    }

    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_tenant_provider", (query) =>
        query.eq("tenantId", schedule.tenantId).eq("provider", "slack")
      )
      .first()

    return { execution, schedule, integration }
  },
})

export const getActiveByTokenHash = internalQuery({
  args: {
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("executions")
      .withIndex("by_token_hash", (query) =>
        query.eq("tokenHash", args.tokenHash)
      )
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
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      status: "running",
      sandboxId: args.sandboxId,
      tokenHash: args.tokenHash,
    })
  },
})

export const finish = internalMutation({
  args: {
    tenantId: v.string(),
    executionId: v.id("executions"),
    fileId: v.id("_storage"),
    status: v.union(v.literal("completed"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("traces", {
      tenantId: args.tenantId,
      executionId: args.executionId,
      fileId: args.fileId,
      createdAt: Date.now(),
    })

    await ctx.db.patch(args.executionId, {
      status: args.status,
      finishedAt: Date.now(),
      tokenHash: undefined,
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
