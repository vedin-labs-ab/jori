import { v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx, mutation } from "../_generated/server"
import { continuePendingConversationRun } from "../conversations/continuation"
import { requireWorkerSecret } from "./shared"

export const record = mutation({
  args: {
    attempt: v.optional(v.number()),
    eventKey: v.string(),
    payload: v.optional(v.any()),
    runId: v.id("runs"),
    secret: v.string(),
    sequence: v.optional(v.number()),
    source: v.string(),
    toolCallId: v.optional(v.string()),
    type: v.string(),
  },
  returns: v.object({
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    const existing = await ctx.db
      .query("logs")
      .withIndex("by_key", (query) => query.eq("eventKey", args.eventKey))
      .first()

    if (existing !== null) {
      return { created: false }
    }

    const run = await ctx.db.get(args.runId)

    if (run === null) {
      throw new Error("Run not found.")
    }

    await ctx.db.insert("logs", {
      tenantId: run.tenantId,
      runId: args.runId,
      eventKey: args.eventKey,
      source: args.source,
      type: args.type,
      sequence: args.sequence,
      toolCallId: args.toolCallId,
      attempt: args.attempt,
      payload: args.payload,
      createdAt: Date.now(),
    })

    await patchRunStatus(ctx, args)
    await patchSessionStatus(ctx, args)

    return { created: true }
  },
})

async function patchSessionStatus(
  ctx: MutationCtx,
  args: {
    runId: Id<"runs">
    type: string
  }
) {
  if (args.type !== "run.completed" && args.type !== "run.failed") {
    return
  }

  await continuePendingConversationRun(ctx, {
    runId: args.runId,
    now: Date.now(),
  })
}

async function patchRunStatus(
  ctx: MutationCtx,
  args: {
    runId: Id<"runs">
    payload?: unknown
    type: string
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
      error: readPayloadString(args.payload, "error"),
      endedAt: Date.now(),
    })
  }
}

function readPayloadString(payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null || !(key in payload)) {
    return undefined
  }

  const value = payload[key as keyof typeof payload]

  return typeof value === "string" ? value : undefined
}
