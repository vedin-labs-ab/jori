import { v } from "convex/values"
import { internal } from "../_generated/api"
import { mutation } from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import {
  readClerkUserEmail,
  readClerkUserName,
  requireClerkUserId,
} from "../identity/users"
import { wakeRun } from "../runtime/waiters/data"

export const stop = mutation({
  args: {
    runId: v.id("runs"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const run = await ctx.db.get(args.runId)

    if (run === null || run.tenantId !== args.tenantId) {
      throw new Error("Run not found.")
    }

    if (run.status !== "queued" && run.status !== "running") {
      return null
    }

    const now = Date.now()

    await ctx.db.patch(run._id, {
      status: "stopped",
      stoppedBy: stoppedByLabel(identity),
      endedAt: now,
    })

    await wakeRun(ctx, { runId: run._id, reason: "cancelled" })
    await ctx.runMutation(internal.runtime.outbox.enqueueCancellation, {
      runId: run._id,
    })

    return null
  },
})

function stoppedByLabel(identity: {
  email?: string
  name?: string
  subject?: string
}) {
  return (
    readClerkUserName(identity) ??
    readClerkUserEmail(identity) ??
    requireClerkUserId(identity)
  )
}
