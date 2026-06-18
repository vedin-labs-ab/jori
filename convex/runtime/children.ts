import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { action, internalMutation } from "../_generated/server"
import { requireWorkerSecret } from "./shared"

export const create = action({
  args: {
    parentRunId: v.id("runs"),
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
      parentRunId: args.parentRunId,
      task: args.task,
      title: args.title,
    })) as { runId: Id<"runs"> }
  },
})

export const insert = internalMutation({
  args: {
    parentRunId: v.id("runs"),
    task: v.string(),
    title: v.optional(v.string()),
  },
  returns: v.object({
    runId: v.id("runs"),
  }),
  handler: async (ctx, args): Promise<{ runId: Id<"runs"> }> => {
    const parent = await ctx.db.get(args.parentRunId)

    if (parent === null) {
      throw new Error("Parent run not found.")
    }

    const runId = await ctx.db.insert("runs", {
      tenantId: parent.tenantId,
      parentRunId: parent._id,
      rootRunId: parent.rootRunId ?? parent._id,
      reason: {
        type: "manual",
        userId: parent.createdBy,
      },
      title: normalizeTitle(args.title, args.task),
      task: args.task,
      display: {
        ...parent.display,
        trigger: "Subagent",
      },
      createdBy: parent.createdBy,
      createdAt: Date.now(),
    })

    await ctx.runMutation(internal.runtime.outbox.ensureRunQueued, { runId })

    return { runId }
  },
})

function normalizeTitle(title: string | undefined, task: string) {
  const value = title?.trim() || task.trim().split("\n").find(Boolean)

  if (value === undefined || value === "") {
    throw new Error("Child run task cannot be empty.")
  }

  return value.length > 90 ? `${value.slice(0, 87)}...` : value
}
