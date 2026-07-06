import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { action, internalMutation } from "../_generated/server"
import { createInstructionRun } from "../runs/instruction"
import { requireWorkerSecret } from "./shared"

export const create = action({
  args: {
    parentId: v.id("runs"),
    secret: v.string(),
    task: v.string(),
    title: v.optional(v.string()),
  },
  returns: v.object({
    runId: v.id("runs"),
  }),
  handler: async (ctx, args): Promise<{ runId: Id<"runs"> }> => {
    requireWorkerSecret(args.secret)

    return (await ctx.runMutation(internal.runtime.agents.insert, {
      parentId: args.parentId,
      task: args.task,
      title: args.title,
    })) as { runId: Id<"runs"> }
  },
})

export const insert = internalMutation({
  args: {
    parentId: v.id("runs"),
    task: v.string(),
    title: v.optional(v.string()),
  },
  returns: v.object({
    runId: v.id("runs"),
  }),
  handler: async (ctx, args): Promise<{ runId: Id<"runs"> }> => {
    const parent = await ctx.db.get(args.parentId)

    if (parent === null) {
      throw new Error("Parent run not found.")
    }

    return {
      runId: await createInstructionRun(ctx, {
        tenantId: parent.tenantId,
        instructions: args.task,
        title: args.title,
        parent,
        createdBy: parent.createdBy,
      }),
    }
  },
})
