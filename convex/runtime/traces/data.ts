import { type Infer, v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx, mutation } from "../../_generated/server"
import { continuePendingConversationRun } from "../../conversations/continuation"
import { requireWorkerSecret } from "../shared"
import { wakeParentForTerminalRun } from "../waiters/data"
import { traceData, traceType } from "./schema"

type TraceData = Infer<typeof traceData>
type TraceInsert = WithoutSystemFields<Doc<"traces">>
type WithoutSystemFields<Row> = Row extends unknown
  ? Omit<Row, "_creationTime" | "_id">
  : never

export const record = mutation({
  args: {
    attempt: v.optional(v.number()),
    callId: v.optional(v.string()),
    data: v.optional(traceData),
    key: v.string(),
    runId: v.id("runs"),
    secret: v.string(),
    sequence: v.optional(v.number()),
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
      if (args.type === "run.completed" || args.type === "run.failed") {
        await wakeParentForTerminalRun(ctx, args.runId)
      }
    }

    return { created }
  },
})

export async function recordTrace(
  ctx: MutationCtx,
  args: {
    attempt?: number
    callId?: string
    data?: TraceData
    key: string
    run: Doc<"runs">
    sequence?: number
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

  await ctx.db.insert("traces", traceInsert(args))

  return true
}

function traceInsert(args: {
  attempt?: number
  callId?: string
  data?: TraceData
  key: string
  run: Doc<"runs">
  sequence?: number
  timestamp?: number
  type: Doc<"traces">["type"]
}): TraceInsert {
  return {
    tenantId: args.run.tenantId,
    runId: args.run._id,
    key: args.key,
    type: args.type,
    ...(args.sequence === undefined ? {} : { sequence: args.sequence }),
    ...(args.attempt === undefined ? {} : { attempt: args.attempt }),
    ...(args.callId === undefined ? {} : { callId: args.callId }),
    ...(args.data === undefined ? {} : { data: args.data }),
    timestamp: args.timestamp ?? Date.now(),
  } as TraceInsert
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

  await continuePendingConversationRun(ctx, {
    runId: args.runId,
    now: Date.now(),
  })
}

async function patchRunStatus(
  ctx: MutationCtx,
  args: {
    data?: TraceData
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
      error: readRunFailedError(args.data),
      endedAt: Date.now(),
    })
  }
}

function readRunFailedError(data: TraceData | undefined) {
  if (data === undefined || !("error" in data)) {
    throw new Error("Run failed trace is missing an error.")
  }

  return data.error
}
