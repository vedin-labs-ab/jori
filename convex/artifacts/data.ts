import { v } from "convex/values"
import { internalMutation, internalQuery } from "../_generated/server"

export const record = internalMutation({
  args: {
    tenantId: v.string(),
    executionId: v.id("executions"),
    storageId: v.id("_storage"),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("artifacts", {
      ...args,
      createdAt: Date.now(),
    })
  },
})

export const getForExecution = internalQuery({
  args: {
    executionId: v.id("executions"),
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.artifactId)

    if (artifact === null || artifact.executionId !== args.executionId) {
      return null
    }

    return artifact
  },
})
