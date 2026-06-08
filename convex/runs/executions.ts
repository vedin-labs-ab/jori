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

export const markRunning = internalMutation({
  args: {
    executionId: v.id("executions"),
    sandboxId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      status: "running",
      sandboxId: args.sandboxId,
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
