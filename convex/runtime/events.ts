import { v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx, mutation } from "../_generated/server"
import { requireWorkerSecret } from "./shared"

export const record = mutation({
  args: {
    attempt: v.optional(v.number()),
    eventKey: v.string(),
    executionId: v.optional(v.id("executions")),
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
      .query("runtimeEvents")
      .withIndex("by_key", (query) => query.eq("eventKey", args.eventKey))
      .first()

    if (existing !== null) {
      return { created: false }
    }

    const run = await ctx.db.get(args.runId)

    if (run === null) {
      throw new Error("Run not found.")
    }

    await ctx.db.insert("runtimeEvents", {
      tenantId: run.tenantId,
      runId: args.runId,
      executionId: args.executionId,
      eventKey: args.eventKey,
      source: args.source,
      type: args.type,
      sequence: args.sequence,
      toolCallId: args.toolCallId,
      attempt: args.attempt,
      payload: args.payload,
      createdAt: Date.now(),
    })

    await patchExecutionStatus(ctx, args)

    return { created: true }
  },
})

async function patchExecutionStatus(
  ctx: MutationCtx,
  args: {
    executionId?: Id<"executions">
    payload?: unknown
    type: string
  }
) {
  if (args.executionId === undefined) {
    return
  }

  if (args.type === "run.started") {
    await ctx.db.patch(args.executionId, { status: "running" })

    return
  }

  if (args.type === "run.completed") {
    await ctx.db.patch(args.executionId, {
      status: "completed",
      error: undefined,
      finishedAt: Date.now(),
    })

    return
  }

  if (args.type === "run.failed") {
    await ctx.db.patch(args.executionId, {
      status: "failed",
      error: readPayloadString(args.payload, "error"),
      finishedAt: Date.now(),
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
