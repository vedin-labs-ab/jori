import { v } from "convex/values"
import { mutation } from "../_generated/server"
import { requireWorkerSecret } from "./shared"

export const upsert = mutation({
  args: {
    executionId: v.id("executions"),
    runId: v.id("runs"),
    sandboxId: v.string(),
    secret: v.string(),
    status: v.union(
      v.literal("created"),
      v.literal("running"),
      v.literal("reconnected")
    ),
    traceHost: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    const execution = await ctx.db.get(args.executionId)

    if (execution === null || execution.runId !== args.runId) {
      throw new Error("Execution not found.")
    }

    const existing = await ctx.db
      .query("runtimeSandboxes")
      .withIndex("by_sandbox", (query) => query.eq("sandboxId", args.sandboxId))
      .first()
    const now = Date.now()

    if (existing === null) {
      await ctx.db.insert("runtimeSandboxes", {
        tenantId: execution.tenantId,
        runId: args.runId,
        executionId: args.executionId,
        provider: "e2b",
        sandboxId: args.sandboxId,
        status: args.status,
        traceHost: args.traceHost,
        createdAt: now,
        updatedAt: now,
      })
    } else {
      await ctx.db.patch(existing._id, {
        status: args.status,
        traceHost: args.traceHost,
        updatedAt: now,
      })
    }

    await ctx.db.patch(args.executionId, {
      sandboxId: args.sandboxId,
    })

    return null
  },
})

export const markCleaned = mutation({
  args: {
    executionId: v.id("executions"),
    error: v.optional(v.string()),
    sandboxId: v.string(),
    secret: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    const existing = await ctx.db
      .query("runtimeSandboxes")
      .withIndex("by_sandbox", (query) => query.eq("sandboxId", args.sandboxId))
      .first()

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        cleanedAt: Date.now(),
        lastError: args.error,
        status: args.error === undefined ? "cleaned" : "failed",
        updatedAt: Date.now(),
      })
    }

    const execution = await ctx.db.get(args.executionId)

    if (execution?.sandboxId === args.sandboxId) {
      await ctx.db.patch(args.executionId, {
        sandboxId: undefined,
      })
    }

    return null
  },
})
