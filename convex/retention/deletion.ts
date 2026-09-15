import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { getAccount } from "../billing/account"
import { findRetention } from "./data"
import { eraseAuth } from "./erasure/auth"
import { purgeContent } from "./erasure/purge"
import { quiesce, workflowsSettled } from "./erasure/quiesce"
import { contentTables } from "./erasure/tables"

export async function beginDeletion(
  ctx: MutationCtx,
  organizationId: string,
  automatic = false
) {
  const account = await getAccount(ctx, organizationId)
  const reason = deletionBlock(account, automatic)
  if (reason) {
    if (automatic) {
      return reason
    }
    throw new Error(reason)
  }
  const existing = await findRetention(ctx, organizationId)
  if (existing && existing.state !== "retained") {
    return null
  }
  const now = Date.now()
  const update = {
    state: "deleting" as const,
    startedAt: now,
    stage: 0,
    nextAt: now,
    blocked: undefined,
  }
  const id =
    existing?._id ??
    (await ctx.db.insert("workspaceRetention", {
      organizationId,
      endedAt: now,
      deletesAt: now,
      ...update,
    }))
  if (existing) {
    await ctx.db.patch(id, update)
  }
  if (account) {
    await ctx.db.patch(account._id, {
      topUp: { charged: account.topUp.charged },
      renewsAt: undefined,
    })
  }
  await ctx.scheduler.runAfter(0, internal.retention.deletion.step, { id })
  return null
}

/** Every stage commits progress, and the hourly sweep recovers interruptions. */
export const step = internalMutation({
  args: { id: v.id("workspaceRetention") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id)
    if (row?.state !== "deleting") {
      return null
    }
    await ctx.db.patch(row._id, {
      nextAt: Date.now() + 60_000,
      blocked: undefined,
    })
    const delay = await advance(ctx, row)
    if (delay !== null) {
      await ctx.scheduler.runAfter(
        delay,
        internal.retention.deletion.step,
        args
      )
    }
    return null
  },
})

async function advance(ctx: MutationCtx, row: Doc<"workspaceRetention">) {
  const stage = row.stage ?? 0
  if (stage < 3) {
    await quiesce(ctx, row)
    return 0
  }
  if (stage < 5) {
    return await settleWorkspace(ctx, row)
  }
  if (stage === 5) {
    const sandbox = await ctx.db
      .query("sandboxes")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", row.organizationId)
      )
      .first()
    if (sandbox) {
      await ctx.scheduler.runAfter(
        0,
        internal.retention.erasure.sandboxes.clean,
        { id: row._id }
      )
      return null
    }
    await ctx.db.patch(row._id, { stage: 6 })
    return 0
  }
  // Cancellation cannot abort an already running action. The platform permits
  // up to 30 minutes; keep records available for its final guarded callbacks.
  // https://docs.convex.dev/production/state/limits
  const drainRemaining =
    (row.startedAt ?? Date.now()) + 35 * 60_000 - Date.now()
  if (drainRemaining > 0) {
    await ctx.db.patch(row._id, {
      blocked: "Waiting for in-flight work to finish.",
      nextAt: Date.now() + drainRemaining,
    })
    return drainRemaining
  }
  if (!row.discoveryErasedAt) {
    await ctx.scheduler.runAfter(0, internal.discovery.sync.erasure.run, {
      id: row._id,
    })
    return 60_000
  }
  if (stage < 6 + contentTables.length) {
    await purgeContent(ctx, row)
    return 0
  }
  if (!(await eraseAuth(ctx, row.organizationId))) {
    return 0
  }
  if (row.noticeId) {
    await ctx.db.delete(row.noticeId)
  }
  await ctx.db.patch(row._id, {
    state: "deleted",
    completedAt: Date.now(),
    nextAt: undefined,
    cursor: undefined,
    noticeId: undefined,
  })
  return null
}

export const sandboxRemoved = internalMutation({
  args: { id: v.id("workspaceRetention"), sandboxId: v.id("sandboxes") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id)
    const sandbox = await ctx.db.get(args.sandboxId)
    if (
      row?.state === "deleting" &&
      sandbox?.organizationId === row.organizationId
    ) {
      await ctx.db.delete(sandbox._id)
    }
  },
})

export const blocked = internalMutation({
  args: { id: v.id("workspaceRetention"), message: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id)
    if (row?.state === "deleting") {
      await ctx.db.patch(row._id, {
        blocked: args.message,
        nextAt: Date.now() + 60_000,
      })
    }
  },
})

function deletionBlock(account: Doc<"accounts"> | null, automatic: boolean) {
  return account?.state.kind === "active" || account?.stripe?.subscriptionId
    ? "Cancel the subscription before deleting this workspace."
    : account && "refundHold" in account && account.refundHold
      ? "Finish the pending refund before deleting this workspace."
      : !automatic && (account?.micros.wallet ?? 0) > 0
        ? "Contact support to refund unused purchased credits before deletion."
        : null
}

/** Operator-only CLI entry point after verifying the customer's request. */
export const request = internalMutation({
  args: { organizationId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await beginDeletion(ctx, args.organizationId)
    return null
  },
})

async function settleWorkspace(
  ctx: MutationCtx,
  row: Doc<"workspaceRetention">
) {
  if (row.stage === 3) {
    if (!(await eraseAuth(ctx, row.organizationId))) {
      return 0
    }
    await ctx.db.patch(row._id, { stage: 4, cursor: undefined })
  }
  return (await workflowsSettled(ctx, row)) ? 0 : 5000
}
