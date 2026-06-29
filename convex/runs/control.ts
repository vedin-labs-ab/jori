import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { mutation } from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import {
  readClerkUserEmail,
  readClerkUserName,
  requireClerkUserId,
} from "../identity/users"
import { ensureClerkPerson } from "../persons/clerk"
import { recordTrace } from "../runtime/traces"
import { wakeRun } from "../runtime/waiters/data"
import { createPersonActor } from "../shared/actor"

export const stop = mutation({
  args: {
    runId: v.id("runs"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const personId = await ensureClerkPerson(ctx, {
      tenantId: args.tenantId,
      clerkSubject: requireClerkUserId(identity),
      email: readClerkUserEmail(identity),
      name: readClerkUserName(identity),
    })
    const run = await ctx.db.get(args.runId)

    if (run === null || run.tenantId !== args.tenantId) {
      throw new Error("Run not found.")
    }

    if (run.status !== "queued" && run.status !== "running") {
      return null
    }

    const now = Date.now()
    const stoppedBy = stoppedByActor(personId, identity)

    await recordTrace(ctx, {
      run,
      key: `run:${run._id}:stopped`,
      source: "convex.runtime",
      timestamp: now,
      type: "run.stopped",
      data: {
        status: "stopped",
        title: "Run stopped",
        ...stoppedSummary(identity),
      },
    })

    await ctx.db.patch(run._id, {
      status: "stopped",
      stoppedBy,
      endedAt: now,
    })

    await wakeRun(ctx, { runId: run._id, reason: "cancelled" })
    await ctx.runMutation(internal.runtime.outbox.enqueueCancellation, {
      runId: run._id,
    })

    return null
  },
})

function stoppedByActor(
  personId: Id<"persons">,
  identity: {
    email?: string
    name?: string
    subject?: string
  }
) {
  return createPersonActor(personId, {
    email: readClerkUserEmail(identity),
    name: readClerkUserName(identity),
  })
}

function stoppedSummary(identity: { email?: string; name?: string }) {
  const label = readClerkUserName(identity) ?? readClerkUserEmail(identity)

  return label === undefined ? {} : { summary: `Stopped by ${label}` }
}
