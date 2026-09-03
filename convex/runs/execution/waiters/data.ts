import {
  createEvent,
  type EventId,
  sendEvent,
  type WorkflowId,
} from "@convex-dev/workflow"
import { type Infer } from "convex/values"
import { isTerminalRunStatus } from "../../../../contracts/runtime/runs"
import { components, internal } from "../../../_generated/api"
import { type Doc, type Id } from "../../../_generated/dataModel"
import { type MutationCtx } from "../../../_generated/server"
import {
  type waiterCondition,
  type waiterReason,
  type waiterSubject,
  waiterWake,
} from "./schema"

type WaiterReason = Infer<typeof waiterReason>
type WaiterSubject = Infer<typeof waiterSubject>
type WaiterCondition = Infer<typeof waiterCondition>
type WaiterWake = Infer<typeof waiterWake>

const eventName = "wake"

/**
 * Park a run: one workflow event the handler awaits, one scheduled expiry, and
 * one row naming both. Every later transition goes through `settleWaiter`, so
 * the event is sent exactly once.
 */
export async function parkRun(
  ctx: MutationCtx,
  args: {
    runId: Id<"runs">
    sessionId?: Id<"sessions">
    expiresAt: number
    condition?: WaiterCondition
    token?: string
  }
) {
  const run = await ctx.db.get(args.runId)

  if (run === null) {
    throw new Error("Run not found.")
  }

  if (run.workflowId === undefined) {
    throw new Error("Run has no workflow to park.")
  }

  await cancelStaleWaiters(ctx, args.runId)
  await validateCondition(ctx, run, args.condition)

  const eventId = await createEvent(ctx, components.workflow, {
    name: eventName,
    workflowId: run.workflowId as WorkflowId,
  })
  const now = Date.now()
  const waiterId = await ctx.db.insert("waiters", {
    organizationId: run.organizationId,
    runId: args.runId,
    ...(args.sessionId === undefined ? {} : { sessionId: args.sessionId }),
    eventId,
    ...(args.token === undefined ? {} : { token: args.token }),
    status: "waiting",
    expiresAt: args.expiresAt,
    ...(args.condition === undefined ? {} : { condition: args.condition }),
    createdAt: now,
    updatedAt: now,
  })

  await ctx.db.patch(waiterId, {
    functionId: await ctx.scheduler.runAt(
      args.expiresAt,
      internal.runs.execution.waiters.records.expire,
      { waiterId }
    ),
  })

  return { waiterId, eventId }
}

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

/** A command reports back over HTTP with the token it was started with. */
export async function wakeCommandWaiter(ctx: MutationCtx, token: string) {
  const waiter = await ctx.db
    .query("waiters")
    .withIndex("by_token", (query) => query.eq("token", token))
    .first()

  if (waiter === null || waiter.status !== "waiting") {
    return false
  }

  return await wakeWaiter(ctx, waiter, { reason: "resolved" })
}

export async function wakeWaiter(
  ctx: MutationCtx,
  waiter: Doc<"waiters">,
  args: { reason: WaiterReason; subject?: WaiterSubject }
) {
  return await settleWaiter(ctx, waiter, { ...args, status: "woken" })
}

/** The run re-checked its condition and found the wait already satisfied, so
 *  it never awaited the event. Close the waiter without sending one. */
export async function resolveWaiter(ctx: MutationCtx, waiterId: Id<"waiters">) {
  const waiter = await ctx.db.get(waiterId)

  if (waiter === null || waiter.status !== "waiting") {
    return null
  }

  await closeWaiter(ctx, waiter, { reason: "resolved", status: "woken" })

  return null
}

export async function expireWaiter(ctx: MutationCtx, waiterId: Id<"waiters">) {
  const waiter = await ctx.db.get(waiterId)

  if (waiter !== null) {
    await settleWaiter(ctx, waiter, { reason: "expired", status: "expired" })
  }

  return null
}

async function settleWaiter(
  ctx: MutationCtx,
  waiter: Doc<"waiters">,
  args: {
    reason: WaiterReason
    status: "expired" | "woken"
    subject?: WaiterSubject
  }
) {
  if (waiter.status !== "waiting") {
    return false
  }

  await closeWaiter(ctx, waiter, args)

  const value: WaiterWake = {
    reason: args.reason,
    waiter: waiter._id,
    ...(args.subject === undefined ? {} : { subject: args.subject }),
  }

  await sendEvent(ctx, components.workflow, {
    id: waiter.eventId as EventId<typeof eventName>,
    validator: waiterWake,
    value,
  })

  return true
}

async function closeWaiter(
  ctx: MutationCtx,
  waiter: Doc<"waiters">,
  args: {
    reason: WaiterReason
    status: "cancelled" | "expired" | "woken"
    subject?: WaiterSubject
  }
) {
  await ctx.db.patch(waiter._id, {
    status: args.status,
    reason: args.reason,
    subject: args.subject,
    updatedAt: Date.now(),
  })

  if (waiter.functionId !== undefined) {
    await ctx.scheduler.cancel(waiter.functionId)
  }
}

async function findActiveWaiter(ctx: MutationCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("waiters")
    .withIndex("by_run_and_status", (query) =>
      query.eq("runId", runId).eq("status", "waiting")
    )
    .first()
}

async function cancelStaleWaiters(ctx: MutationCtx, runId: Id<"runs">) {
  const stale = ctx.db
    .query("waiters")
    .withIndex("by_run_and_status", (query) =>
      query.eq("runId", runId).eq("status", "waiting")
    )

  for await (const waiter of stale) {
    await closeWaiter(ctx, waiter, {
      reason: "cancelled",
      status: "cancelled",
    })
  }
}

async function validateCondition(
  ctx: MutationCtx,
  run: { _id: Id<"runs">; organizationId: string },
  condition: WaiterCondition | undefined
) {
  if (condition === undefined || condition.kind === "command") {
    return
  }

  if (condition.runIds.length === 0 || condition.runIds.length > 20) {
    throw new Error("Agent waits require 1-20 child runs.")
  }

  for (const runId of new Set(condition.runIds)) {
    const child = await ctx.db.get(runId)

    if (
      child === null ||
      child.organizationId !== run.organizationId ||
      child.parentId !== run._id
    ) {
      throw new Error("Agent waits may only target direct child runs.")
    }
  }
}

async function allRunsTerminal(ctx: MutationCtx, runIds: Id<"runs">[]) {
  for (const runId of runIds) {
    const run = await ctx.db.get(runId)

    if (run === null || !isTerminalRunStatus(run.status)) {
      return false
    }
  }

  return true
}
