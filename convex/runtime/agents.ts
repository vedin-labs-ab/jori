import { v } from "convex/values"
import { type AgentRunStatus } from "../../contracts/runtime/worker"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { action, internalMutation, query } from "../_generated/server"
import { resolveSubtaskAccess } from "../runs/access"
import { createInstructionRun } from "../runs/instruction"
import { runStatus } from "../runs/schema"
import { stopRunTree } from "../runs/tree"
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
        organizationId: parent.organizationId,
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

export const stop = action({
  args: {
    parentId: v.id("runs"),
    runId: v.id("runs"),
    secret: v.string(),
  },
  returns: v.object({
    runId: v.id("runs"),
    status: v.string(),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{ runId: Id<"runs">; status: string }> => {
    requireWorkerSecret(args.secret)

    return (await ctx.runMutation(internal.runtime.agents.stopChild, {
      parentId: args.parentId,
      runId: args.runId,
    })) as { runId: Id<"runs">; status: string }
  },
})

export const stopChild = internalMutation({
  args: {
    parentId: v.id("runs"),
    runId: v.id("runs"),
  },
  returns: v.object({
    runId: v.id("runs"),
    status: v.string(),
  }),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)

    if (run === null || run.parentId !== args.parentId) {
      throw new Error("Agents may only stop their direct child runs.")
    }

    await stopRunTree(ctx, run)

    const stopped = await ctx.db.get(args.runId)

    return { runId: args.runId, status: stopped?.status ?? run.status }
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
      status: runStatus,
      error: v.union(v.string(), v.null()),
      result: v.union(v.string(), v.null()),
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
        result: run.result ?? null,
      })
    }

    return children
  },
})
