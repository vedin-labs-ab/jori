import { v } from "convex/values"
import { internal } from "../_generated/api"
import { internalMutation } from "../_generated/server"
import { isWorkspaceDeleting } from "../retention/access"
import { requireRegion } from "../shared/origin"
import { canRetry, leaseMs, retentionMs, retryDelay } from "./policy"
import { message } from "./schema"

export const enqueue = internalMutation({
  args: { message, organizationId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (
      args.organizationId &&
      (await isWorkspaceDeleting(ctx, args.organizationId))
    ) {
      throw new Error("This workspace has been deleted.")
    }
    const recipient = args.message.to.trim().toLowerCase()
    const id = await ctx.db.insert("emailSubmissions", {
      region: requireRegion(),
      organizationId: args.organizationId,
      message: { ...args.message, to: recipient },
      status: "queued",
      attempts: 0,
      dueAt: Date.now(),
      expiresAt: Date.now() + retentionMs,
    })
    await ctx.scheduler.runAfter(0, internal.email.dispatch.run, { id })
    return id
  },
})

export const claim = internalMutation({
  args: { id: v.id("emailSubmissions") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id)
    if (!row?.message || row.dueAt === undefined || row.dueAt > Date.now()) {
      return null
    }
    if (
      row.organizationId &&
      (await isWorkspaceDeleting(ctx, row.organizationId))
    ) {
      await ctx.db.patch(id, {
        status: "failed",
        message: undefined,
        dueAt: undefined,
        failure: "workspace_deleted",
      })
      return null
    }
    if (
      row.firstAttemptAt !== undefined &&
      !canRetry(row.firstAttemptAt, row.attempts, Date.now())
    ) {
      await ctx.db.patch(id, {
        status: "uncertain",
        message: undefined,
        dueAt: undefined,
        failure: "retry_window_closed",
      })
      return null
    }
    const attempts = row.attempts + 1
    await ctx.db.patch(id, {
      attempts,
      status: "sending",
      dueAt: Date.now() + leaseMs,
      firstAttemptAt: row.firstAttemptAt ?? Date.now(),
    })
    return { ...row, attempts }
  },
})

export const finish = internalMutation({
  args: {
    id: v.id("emailSubmissions"),
    attempt: v.number(),
    result: v.union(
      v.object({ kind: v.literal("accepted"), providerId: v.string() }),
      v.object({ kind: v.literal("failed"), failure: v.string() }),
      v.object({
        kind: v.literal("retry"),
        failure: v.string(),
        retryAfterMs: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { id, attempt, result }) => {
    const row = await ctx.db.get(id)
    if (!row || row.attempts !== attempt || row.status !== "sending") {
      return
    }
    if (result.kind === "accepted") {
      await ctx.db.patch(id, {
        status: "accepted",
        providerId: result.providerId,
        message: undefined,
        dueAt: undefined,
        failure: undefined,
      })
    } else if (result.kind === "failed") {
      await ctx.db.patch(id, {
        status: "failed",
        failure: result.failure,
        message: undefined,
        dueAt: undefined,
      })
    } else {
      const dueAt = Date.now() + retryDelay(attempt, result.retryAfterMs)
      await ctx.db.patch(id, {
        status: "queued",
        failure: result.failure,
        dueAt,
      })
      await ctx.scheduler.runAt(dueAt, internal.email.dispatch.run, { id })
    }
  },
})
