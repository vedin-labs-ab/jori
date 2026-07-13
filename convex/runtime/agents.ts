import { v } from "convex/values"
import { type AgentRunStatus } from "../../contracts/runtime/worker"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { action, internalMutation, query } from "../_generated/server"
import { resolveSubtaskAccess } from "../runs/access"
import { createInstructionRun } from "../runs/instruction"
import { requireWorkerSecret } from "./secret"

export const create = action({
  args: {
    parentId: v.id("runs"),
    secret: v.string(),
    task: v.string(),
    title: v.string(),
    tools: v.optional(v.array(v.string())),
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
      tools: args.tools,
    })) as { runId: Id<"runs"> }
  },
})

export const insert = internalMutation({
  args: {
    parentId: v.id("runs"),
    task: v.string(),
    title: v.string(),
    tools: v.optional(v.array(v.string())),
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
        access: await resolveSubtaskAccess(ctx, {
          parent,
          tools: args.tools,
        }),
        parent,
        createdBy: parent.createdBy,
        principal: parent.principal,
      }),
    }
  },
})

export const readChildren = query({
  args: {
    parentId: v.id("runs"),
    runIds: v.array(v.id("runs")),
    secret: v.string(),
  },
  returns: v.array(
    v.object({
      runId: v.id("runs"),
      title: v.string(),
      status: v.union(
        v.literal("queued"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("stopped")
      ),
      error: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, args): Promise<AgentRunStatus[]> => {
    requireWorkerSecret(args.secret)

    if (args.runIds.length === 0 || args.runIds.length > 20) {
      throw new Error("Agent waits require 1-20 child runs.")
    }

    const children = []

    for (const runId of new Set(args.runIds)) {
      const run = await ctx.db.get(runId)

      if (run === null || run.parentId !== args.parentId) {
        throw new Error("Agent waits may only target direct child runs.")
      }

      children.push({
        runId: run._id,
        title: run.snapshot.title,
        status: run.status,
        error: run.error ?? null,
      })
    }

    return children
  },
})
