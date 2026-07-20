import { internal } from "../../../_generated/api"
import { type Doc, type Id } from "../../../_generated/dataModel"
import { type MutationCtx } from "../../../_generated/server"
import { formatRuntimeError } from "./error"

const maxAttempts = 8
const processingLeaseMs = 5 * 60 * 1000

export async function queueRun(ctx: MutationCtx, runId: Id<"runs">) {
  const run = await ctx.db.get(runId)

  if (run === null) {
    return null
  }

  return await enqueueRun(ctx, run)
}

export async function enqueueCancellation(ctx: MutationCtx, runId: Id<"runs">) {
  const run = await ctx.db.get(runId)

  if (run === null) {
    return null
  }

  return await enqueueOperation(ctx, {
    organizationId: run.organizationId,
    key: `cancel:${run._id}`,
    operation: {
      type: "run.cancel",
      runId: run._id,
    },
  })
}

export async function claimNext(ctx: MutationCtx, now: number) {
  const item =
    (await claimableItem(ctx, "pending", now)) ??
    (await claimableItem(ctx, "processing", now))

  if (item === null) {
    return null
  }

  await ctx.db.patch(item._id, {
    attempts: item.attempts + 1,
    dueAt: now + processingLeaseMs,
    status: "processing",
    updatedAt: now,
  })

  return {
    ...item,
    attempts: item.attempts + 1,
    dueAt: now + processingLeaseMs,
    status: "processing" as const,
    updatedAt: now,
  }
}

async function claimableItem(
  ctx: MutationCtx,
  status: Doc<"outbox">["status"],
  now: number
) {
  return await ctx.db
    .query("outbox")
    .withIndex("by_status_and_due_at", (query) =>
      query.eq("status", status).lte("dueAt", now)
    )
    .first()
}

export async function markSent(
  ctx: MutationCtx,
  args: { outboxId: Id<"outbox">; receiptId?: string }
) {
  const item = await ctx.db.get(args.outboxId)

  if (item === null) {
    return null
  }

  await applyReceipt(ctx, item, args.receiptId)
  await ctx.db.patch(args.outboxId, {
    error: undefined,
    receiptId: args.receiptId,
    status: "sent",
    updatedAt: Date.now(),
  })

  return null
}

export async function markFailed(
  ctx: MutationCtx,
  args: { error: string; outboxId: Id<"outbox"> }
) {
  const item = await ctx.db.get(args.outboxId)

  if (item === null) {
    return null
  }

  const retry = item.attempts < maxAttempts
  const delayMs = retry ? retryDelayMs(item.attempts) : 0

  await ctx.db.patch(args.outboxId, {
    dueAt: Date.now() + delayMs,
    error: formatRuntimeError(args.error),
    status: retry ? "pending" : "failed",
    updatedAt: Date.now(),
  })

  return null
}

async function enqueueRun(ctx: MutationCtx, run: Doc<"runs">) {
  return await enqueueOperation(ctx, {
    organizationId: run.organizationId,
    key: `run:${run._id}`,
    operation: {
      type: "run.start",
      runId: run._id,
    },
  })
}

export async function enqueueOperation(
  ctx: MutationCtx,
  args: Pick<Doc<"outbox">, "key" | "operation" | "organizationId">
) {
  const existing = await ctx.db
    .query("outbox")
    .withIndex("by_key", (query) => query.eq("key", args.key))
    .first()

  if (existing !== null) {
    await ctx.scheduler.runAfter(
      0,
      internal.runs.execution.outbox.dispatch.drain,
      {}
    )
    return existing._id
  }

  const now = Date.now()
  const outboxId = await ctx.db.insert("outbox", {
    ...args,
    attempts: 0,
    createdAt: now,
    dueAt: now,
    status: "pending",
    updatedAt: now,
  })

  await ctx.scheduler.runAfter(
    0,
    internal.runs.execution.outbox.dispatch.drain,
    {}
  )

  return outboxId
}

async function applyReceipt(
  ctx: MutationCtx,
  item: Doc<"outbox">,
  receiptId: string | undefined
) {
  if (item.operation.type !== "run.start" || receiptId === undefined) {
    return
  }

  await ctx.db.patch(item.operation.runId, {
    workerId: receiptId,
  })
}

function retryDelayMs(attempts: number) {
  return Math.min(60_000, 1000 * 2 ** Math.max(0, attempts - 1))
}
