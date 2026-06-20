import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { findActiveSandbox } from "./sandboxes"
import { formatRuntimeError } from "./shared"

const maxAttempts = 8
const processingLeaseMs = 5 * 60 * 1000

export async function queueRun(ctx: MutationCtx, runId: Id<"runs">) {
  const run = await ctx.db.get(runId)

  if (run === null) {
    return null
  }

  return await enqueueRun(ctx, run)
}

export const ensureQueued = internalMutation({
  args: {
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await queueRun(ctx, args.runId)
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
        type: "approval.resume",
        approvalId: approval._id,
        decision: args.decision,
        waitpointTokenId: approval.waitpointTokenId,
      },
    })
  },
})

export const enqueueCancellation = internalMutation({
  args: {
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)

    if (run === null) {
      return null
    }

    const sandbox = await findActiveSandbox(ctx, run._id)

    return await enqueueOperation(ctx, {
      tenantId: run.tenantId,
      idempotencyKey: `cancel:${run._id}`,
      operation: {
        type: "run.cancel",
        runId: run._id,
        sandboxId: sandbox?.sandboxId,
        workerId: run.workerId,
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
    const item =
      (await claimableItem(ctx, "pending", args.now)) ??
      (await claimableItem(ctx, "processing", args.now))

    if (item === null) {
      return null
    }

    await ctx.db.patch(item._id, {
      attempts: item.attempts + 1,
      nextAttemptAt: args.now + processingLeaseMs,
      state: "processing",
      updatedAt: args.now,
    })

    return { ...item, attempts: item.attempts + 1, state: "processing" }
  },
})

async function claimableItem(
  ctx: MutationCtx,
  state: Doc<"outbox">["state"],
  now: number
) {
  return await ctx.db
    .query("outbox")
    .withIndex("by_state_and_next_attempt", (query) =>
      query.eq("state", state).lte("nextAttemptAt", now)
    )
    .first()
}

export const markSent = internalMutation({
  args: {
    externalId: v.optional(v.string()),
    outboxId: v.id("outbox"),
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
    outboxId: v.id("outbox"),
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

async function enqueueRun(ctx: MutationCtx, run: Doc<"runs">) {
  return await enqueueOperation(ctx, {
    tenantId: run.tenantId,
    idempotencyKey: `run:${run._id}`,
    operation: {
      type: "run.start",
      runId: run._id,
    },
  })
}

export async function enqueueOperation(
  ctx: MutationCtx,
  args: Pick<Doc<"outbox">, "idempotencyKey" | "operation" | "tenantId">
) {
  const existing = await ctx.db
    .query("outbox")
    .withIndex("by_idempotency", (query) =>
      query.eq("idempotencyKey", args.idempotencyKey)
    )
    .first()

  if (existing !== null) {
    await ctx.scheduler.runAfter(0, internal.runtime.dispatch.drain, {})
    return existing._id
  }

  const now = Date.now()
  const outboxId = await ctx.db.insert("outbox", {
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
  item: Doc<"outbox">,
  externalId: string | undefined
) {
  if (item.operation.type !== "run.start" || externalId === undefined) {
    return
  }

  await ctx.db.patch(item.operation.runId, {
    workerId: externalId,
  })
}

function retryDelayMs(attempts: number) {
  return Math.min(60_000, 1000 * 2 ** Math.max(0, attempts - 1))
}
