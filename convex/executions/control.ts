import { v } from "convex/values"
import { internal } from "../_generated/api"
import { mutation } from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import {
  readClerkUserEmail,
  readClerkUserName,
  requireClerkUserId,
} from "../identity/users"

export const stop = mutation({
  args: {
    executionId: v.id("executions"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const execution = await ctx.db.get(args.executionId)

    if (execution === null || execution.tenantId !== args.tenantId) {
      throw new Error("Execution not found.")
    }

    if (execution.status !== "queued" && execution.status !== "running") {
      return null
    }

    const now = Date.now()

    // Clearing hash and trace credentials revokes the sandbox's callback
    // auth and live trace access immediately, even before the kill lands.
    await ctx.db.patch(execution._id, {
      status: "stopped",
      stoppedBy: stoppedByLabel(identity),
      stoppedAt: now,
      finishedAt: now,
      hash: undefined,
      trace: undefined,
    })

    if (execution.sandboxId !== undefined) {
      await ctx.scheduler.runAfter(0, internal.executions.runtime.killSandbox, {
        sandboxId: execution.sandboxId,
      })
    }

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
