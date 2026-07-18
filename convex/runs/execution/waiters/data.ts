import { type Infer } from "convex/values"
import { type Id } from "../../../_generated/dataModel"
import { type MutationCtx } from "../../../_generated/server"
import { type QueryLikeCtx } from "../../../shared/context"
import { enqueueOperation } from "../outbox/data"
import {
  type waiterCondition,
  type waiterReason,
  type waiterSubject,
} from "./schema"

type WaiterReason = Infer<typeof waiterReason>
type WaiterSubject = Infer<typeof waiterSubject>
type WaiterCondition = Infer<typeof waiterCondition>

export async function wakeRun(
  ctx: MutationCtx,
  args: {
    runId: Id<"runs">
    reason: WaiterReason
    subject?: WaiterSubject
  }
) {
  const waiter = await findActiveWaiter(ctx, args.runId)

  if (waiter === null) {
    return false
  }

  return await wakeWaiter(ctx, waiter, args)
}

export async function wakeParentForTerminalRun(
  ctx: MutationCtx,
  runId: Id<"runs">
) {
  const run = await ctx.db.get(runId)

  if (run?.parentId === undefined) {
    return false
  }

  const waiter = await findActiveWaiter(ctx, run.parentId)
  const condition = waiter?.condition

  if (
    waiter === null ||
    condition === undefined ||
    condition.kind !== "runs" ||
    !condition.runIds.includes(runId) ||
    !(await allRunsTerminal(ctx, condition.runIds))
  ) {
    return false
  }

  return await wakeWaiter(ctx, waiter, {
    reason: "resolved",
    subject: { kind: "run", id: runId },
  })
}

async function findActiveWaiter(ctx: MutationCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("waiters")
    .withIndex("by_run_and_status", (query) =>
      query.eq("runId", runId).eq("status", "waiting")
    )
    .first()
}

export async function createWaiter(
  ctx: MutationCtx,
  args: {
    runId: Id<"runs">
    sessionId?: Id<"sessions">
    waitpointId: string
    expiresAt: number
    condition?: WaiterCondition
  }
): Promise<Id<"waiters">> {
  const run = await ctx.db.get(args.runId)

  if (run === null) {
    throw new Error("Run not found.")
  }

  await cancelStaleWaiters(ctx, args.runId)
  await validateCondition(ctx, run, args.condition)

  const now = Date.now()

  return await ctx.db.insert("waiters", {
    tenantId: run.tenantId,
    runId: args.runId,
    ...(args.sessionId === undefined ? {} : { sessionId: args.sessionId }),
    waitpointId: args.waitpointId,
    status: "waiting",
    expiresAt: args.expiresAt,
    ...(args.condition === undefined ? {} : { condition: args.condition }),
    createdAt: now,
    updatedAt: now,
  })
}

export async function expireWaiter(ctx: MutationCtx, waiterId: Id<"waiters">) {
  const waiter = await ctx.db.get(waiterId)

  if (waiter !== null && waiter.status === "waiting") {
    await ctx.db.patch(waiter._id, {
      status: "expired",
      reason: "expired",
      updatedAt: Date.now(),
    })
  }

  return null
}

export async function getWaiter(ctx: QueryLikeCtx, waiterId: Id<"waiters">) {
  return await ctx.db.get(waiterId)
}

async function cancelStaleWaiters(ctx: MutationCtx, runId: Id<"runs">) {
  const stale = ctx.db
    .query("waiters")
    .withIndex("by_run_and_status", (query) =>
      query.eq("runId", runId).eq("status", "waiting")
    )

  for await (const waiter of stale) {
    await ctx.db.patch(waiter._id, {
      status: "cancelled",
      reason: "cancelled",
      updatedAt: Date.now(),
    })
  }
}

async function validateCondition(
  ctx: MutationCtx,
  run: { _id: Id<"runs">; tenantId: string },
  condition: WaiterCondition | undefined
) {
  if (condition === undefined) {
    return
  }

  if (condition.runIds.length === 0 || condition.runIds.length > 20) {
    throw new Error("Agent waits require 1-20 child runs.")
  }

  for (const runId of new Set(condition.runIds)) {
    const child = await ctx.db.get(runId)

    if (
      child === null ||
      child.tenantId !== run.tenantId ||
      child.parentId !== run._id
    ) {
      throw new Error("Agent waits may only target direct child runs.")
    }
  }
}

async function allRunsTerminal(ctx: MutationCtx, runIds: Id<"runs">[]) {
  for (const runId of runIds) {
    const run = await ctx.db.get(runId)

    if (
      run === null ||
      (run.status !== "completed" &&
        run.status !== "failed" &&
        run.status !== "stopped")
    ) {
      return false
    }
  }

  return true
}

async function wakeWaiter(
  ctx: MutationCtx,
  waiter: NonNullable<Awaited<ReturnType<typeof findActiveWaiter>>>,
  args: { reason: WaiterReason; subject?: WaiterSubject }
) {
  await ctx.db.patch(waiter._id, {
    status: "woken",
    reason: args.reason,
    subject: args.subject,
    updatedAt: Date.now(),
  })
  await enqueueOperation(ctx, {
    tenantId: waiter.tenantId,
    key: `waiter:${waiter._id}:wake`,
    operation: {
      type: "waiter.wake",
      waiterId: waiter._id,
      reason: args.reason,
      ...(args.subject === undefined ? {} : { subject: args.subject }),
    },
  })

  return true
}
