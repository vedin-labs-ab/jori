import { type Infer, v } from "convex/values"
import { type Id } from "../../_generated/dataModel"
import {
  internalQuery,
  type MutationCtx,
  mutation,
} from "../../_generated/server"
import { enqueueOperation } from "../outbox"
import { requireWorkerSecret } from "../shared"
import { type waiterReason, type waiterSubject } from "./schema"

type WaiterReason = Infer<typeof waiterReason>
type WaiterSubject = Infer<typeof waiterSubject>

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
    return
  }

  const now = Date.now()

  await ctx.db.patch(waiter._id, {
    status: "woken",
    reason: args.reason,
    subject: args.subject,
    wokenAt: now,
    updatedAt: now,
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
}

async function findActiveWaiter(ctx: MutationCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("waiters")
    .withIndex("by_run_and_status", (query) =>
      query.eq("runId", runId).eq("status", "waiting")
    )
    .first()
}

export const create = mutation({
  args: {
    secret: v.string(),
    runId: v.id("runs"),
    sessionId: v.optional(v.id("sessions")),
    waitpointId: v.string(),
    expiresAt: v.number(),
  },
  returns: v.id("waiters"),
  handler: async (ctx, args): Promise<Id<"waiters">> => {
    requireWorkerSecret(args.secret)

    const run = await ctx.db.get(args.runId)

    if (run === null) {
      throw new Error("Run not found.")
    }

    await cancelStaleWaiters(ctx, args.runId)

    const now = Date.now()

    return await ctx.db.insert("waiters", {
      tenantId: run.tenantId,
      runId: args.runId,
      ...(args.sessionId === undefined ? {} : { sessionId: args.sessionId }),
      waitpointId: args.waitpointId,
      status: "waiting",
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const expire = mutation({
  args: {
    secret: v.string(),
    waiterId: v.id("waiters"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    const waiter = await ctx.db.get(args.waiterId)

    if (waiter !== null && waiter.status === "waiting") {
      await ctx.db.patch(waiter._id, {
        status: "expired",
        reason: "expired",
        updatedAt: Date.now(),
      })
    }

    return null
  },
})

export const get = internalQuery({
  args: {
    waiterId: v.id("waiters"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.waiterId)
  },
})

async function cancelStaleWaiters(ctx: MutationCtx, runId: Id<"runs">) {
  const stale = ctx.db
    .query("waiters")
    .withIndex("by_run_and_status", (query) =>
      query.eq("runId", runId).eq("status", "waiting")
    )

  for await (const waiter of stale) {
    await ctx.db.patch(waiter._id, {
      status: "cancelled",
      updatedAt: Date.now(),
    })
  }
}
