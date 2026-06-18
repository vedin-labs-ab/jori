import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { formatRuntimeError } from "./shared"

const maxAttempts = 8

export async function createQueuedExecution(
  ctx: MutationCtx,
  runId: Id<"runs">
) {
  const run = await ctx.db.get(runId)

  if (run === null) {
    return null
  }

  const existing = await ctx.db
    .query("executions")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .first()

  if (existing !== null) {
    await enqueueRun(ctx, run, existing._id)

    return existing._id
  }

  const executionId = await ctx.db.insert("executions", {
    tenantId: run.tenantId,
    runId,
    status: "queued",
    createdBy: run.createdBy,
    createdAt: Date.now(),
  })

  await enqueueRun(ctx, run, executionId)

  return executionId
}

export const ensureRunQueued = internalMutation({
  args: {
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await createQueuedExecution(ctx, args.runId)
  },
})

export const enqueueApprovalResume = internalMutation({
  args: {
    approvalId: v.id("approvals"),
    decision: v.union(v.literal("approved"), v.literal("denied")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (approval === null || approval.waitpointTokenId === undefined) {
      return null
    }

    return await enqueueOperation(ctx, {
      tenantId: approval.tenantId,
      idempotencyKey: `approval:${approval._id}:${args.decision}`,
      operation: {
        type: "resumeApproval",
        approvalId: approval._id,
        decision: args.decision,
        waitpointTokenId: approval.waitpointTokenId,
      },
    })
  },
})

export const enqueueCancellation = internalMutation({
  args: {
    executionId: v.id("executions"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId)

    if (execution === null) {
      return null
    }

    return await enqueueOperation(ctx, {
      tenantId: execution.tenantId,
      idempotencyKey: `cancel:${execution._id}`,
      operation: {
        type: "cancelRun",
        executionId: execution._id,
        runId: execution.runId,
        sandboxId: execution.sandboxId,
        triggerRunId: execution.triggerRunId,
      },
    })
  },
})

export const claimNext = internalMutation({
  args: {
    now: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const item = await ctx.db
      .query("runtimeOutbox")
      .withIndex("by_state_and_next_attempt", (query) =>
        query.eq("state", "pending").lte("nextAttemptAt", args.now)
      )
      .first()

    if (item === null) {
      return null
    }

    await ctx.db.patch(item._id, {
      attempts: item.attempts + 1,
      state: "processing",
      updatedAt: args.now,
    })

    return { ...item, attempts: item.attempts + 1, state: "processing" }
  },
})

export const markSent = internalMutation({
  args: {
    externalId: v.optional(v.string()),
    outboxId: v.id("runtimeOutbox"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.outboxId)

    if (item === null) {
      return null
    }

    await applyExternalId(ctx, item, args.externalId)
    await ctx.db.patch(args.outboxId, {
      externalId: args.externalId,
      lastError: undefined,
      state: "sent",
      updatedAt: Date.now(),
    })

    return null
  },
})

export const markFailed = internalMutation({
  args: {
    error: v.string(),
    outboxId: v.id("runtimeOutbox"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.outboxId)

    if (item === null) {
      return null
    }

    const retry = item.attempts < maxAttempts
    const delayMs = retry ? retryDelayMs(item.attempts) : 0

    await ctx.db.patch(args.outboxId, {
      lastError: formatRuntimeError(args.error),
      nextAttemptAt: Date.now() + delayMs,
      state: retry ? "pending" : "failed",
      updatedAt: Date.now(),
    })

    return null
  },
})

async function enqueueRun(
  ctx: MutationCtx,
  run: Doc<"runs">,
  executionId: Id<"executions">
) {
  return await enqueueOperation(ctx, {
    tenantId: run.tenantId,
    idempotencyKey: `run:${run._id}:execution:${executionId}`,
    operation: {
      type: "enqueueRun",
      runId: run._id,
      executionId,
      parentRunId: run.parentRunId,
      rootRunId: run.rootRunId,
    },
  })
}

async function enqueueOperation(
  ctx: MutationCtx,
  args: Pick<Doc<"runtimeOutbox">, "idempotencyKey" | "operation" | "tenantId">
) {
  const existing = await ctx.db
    .query("runtimeOutbox")
    .withIndex("by_idempotency", (query) =>
      query.eq("idempotencyKey", args.idempotencyKey)
    )
    .first()

  if (existing !== null) {
    return existing._id
  }

  const now = Date.now()
  const outboxId = await ctx.db.insert("runtimeOutbox", {
    ...args,
    attempts: 0,
    createdAt: now,
    nextAttemptAt: now,
    state: "pending",
    updatedAt: now,
  })

  await ctx.scheduler.runAfter(0, internal.runtime.dispatch.drain, {})

  return outboxId
}

async function applyExternalId(
  ctx: MutationCtx,
  item: Doc<"runtimeOutbox">,
  externalId: string | undefined
) {
  if (item.operation.type !== "enqueueRun" || externalId === undefined) {
    return
  }

  await ctx.db.patch(item.operation.executionId, {
    triggerRunId: externalId,
  })
}

function retryDelayMs(attempts: number) {
  return Math.min(60_000, 1000 * 2 ** Math.max(0, attempts - 1))
}
