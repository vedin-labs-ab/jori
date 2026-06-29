import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx, mutation } from "../_generated/server"
import { continuePendingWatchRun } from "../watches/continuation"
import { traceData, traceSource, traceType } from "./schema"
import { requireWorkerSecret } from "./shared"

export const record = mutation({
  args: {
    attempt: v.optional(v.number()),
    callId: v.optional(v.string()),
    data: v.optional(traceData),
    key: v.string(),
    runId: v.id("runs"),
    secret: v.string(),
    sequence: v.optional(v.number()),
    source: traceSource,
    type: traceType,
  },
  returns: v.object({
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    const run = await ctx.db.get(args.runId)

    if (run === null) {
      throw new Error("Run not found.")
    }

    if (run.status === "stopped") {
      return { created: false }
    }

    const created = await recordTrace(ctx, {
      ...args,
      run,
    })

    if (created) {
      await patchRunStatus(ctx, args)
      await patchSessionStatus(ctx, args)
    }

    return { created }
  },
})

export async function recordTrace(
  ctx: MutationCtx,
  args: {
    attempt?: number
    callId?: string
    data?: Doc<"traces">["data"]
    key: string
    run: Doc<"runs">
    sequence?: number
    source: Doc<"traces">["source"]
    timestamp?: number
    type: Doc<"traces">["type"]
  }
) {
  const existing = await ctx.db
    .query("traces")
    .withIndex("by_key", (query) => query.eq("key", args.key))
    .first()

  if (existing !== null) {
    return false
  }

  await ctx.db.insert("traces", {
    tenantId: args.run.tenantId,
    runId: args.run._id,
    key: args.key,
    source: args.source,
    type: args.type,
    sequence: args.sequence,
    callId: args.callId,
    attempt: args.attempt,
    data: args.data,
    timestamp: args.timestamp ?? Date.now(),
  })

  return true
}

async function patchSessionStatus(
  ctx: MutationCtx,
  args: {
    runId: Id<"runs">
    type: Doc<"traces">["type"]
  }
) {
  if (args.type !== "run.completed" && args.type !== "run.failed") {
    return
  }

  await continuePendingWatchRun(ctx, {
    runId: args.runId,
    now: Date.now(),
  })
}

async function patchRunStatus(
  ctx: MutationCtx,
  args: {
    data?: Doc<"traces">["data"]
    runId: Id<"runs">
    type: Doc<"traces">["type"]
  }
) {
  const run = await ctx.db.get(args.runId)

  if (run === null || run.status === "stopped") {
    return
  }

  if (args.type === "run.started") {
    if (run.status === "queued" || run.status === "running") {
      await ctx.db.patch(args.runId, { status: "running" })
    }

    return
  }

  if (args.type === "run.completed") {
    if (run.status !== "queued" && run.status !== "running") {
      return
    }

    await ctx.db.patch(args.runId, {
      status: "completed",
      error: undefined,
      endedAt: Date.now(),
    })

    return
  }

  if (args.type === "run.failed") {
    if (run.status !== "queued" && run.status !== "running") {
      return
    }

    await ctx.db.patch(args.runId, {
      status: "failed",
      error: readDataString(args.data, "error"),
      endedAt: Date.now(),
    })
  }
}

function readDataString(data: Doc<"traces">["data"], key: string) {
  if (typeof data !== "object" || data === null || !(key in data)) {
    return undefined
  }

  const value = data[key as keyof typeof data]

  return typeof value === "string" ? value : undefined
}
