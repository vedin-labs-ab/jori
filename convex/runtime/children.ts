import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { action, internalMutation } from "../_generated/server"
import { createInstructionRunSnapshot } from "../runs/snapshot"
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

    return (await ctx.runMutation(internal.runtime.children.insert, {
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

    const runId = await ctx.db.insert("runs", {
      tenantId: parent.tenantId,
      parentId: parent._id,
      rootId: parent.rootId ?? parent._id,
      cause: {
        type: "manual",
        userId: parent.createdBy,
      },
      ...createInstructionRunSnapshot({
        instructions: args.task,
        parent,
        title: args.title,
      }),
      status: "queued",
      createdBy: parent.createdBy,
      createdAt: Date.now(),
    })

    await ctx.runMutation(internal.runtime.outbox.ensureQueued, { runId })

    return { runId }
  },
})
