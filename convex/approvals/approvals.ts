import { v } from "convex/values"
import { approvalTtlMs } from "../../contracts/approvals"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { actorValidator } from "../shared/actor"
import { toolSurfaceValidator } from "../shared/integrations"
import { approvalDecision, approvalDelivery } from "./schema"
import {
  markApprovalCancelled,
  markApprovalDecided,
  markApprovalExpired,
  patchAndRead,
  recordApprovalCreated,
  recordApprovalDelivery,
} from "./transition"

export const create = internalMutation({
  args: {
    tenantId: v.string(),
    runId: v.id("runs"),
    surface: toolSurfaceValidator,
    tool: v.string(),
    inputJson: v.string(),
    summary: v.string(),
    code: v.string(),
    requestedBy: actorValidator,
  },
  handler: async (ctx, args) => {
    const reusable = await findReusableApproval(ctx, args)

    if (reusable !== null) {
      return {
        approvalId: reusable._id,
        code: reusable.code,
        expiresAt: reusable.expiresAt,
        reused: true,
      }
    }

    const now = Date.now()
    const expiresAt = now + approvalTtlMs
    const approvalId = await ctx.db.insert("approvals", {
      tenantId: args.tenantId,
      runId: args.runId,
      surface: args.surface,
      tool: args.tool,
      args: args.inputJson,
      summary: args.summary,
      code: args.code,
      status: "pending",
      requestedBy: args.requestedBy,
      createdAt: now,
      expiresAt,
    })
    const functionId = await ctx.scheduler.runAt(
      expiresAt,
      internal.approvals.runtime.expireApproval,
      { approvalId }
    )
    const approval = await patchAndRead(ctx, approvalId, { functionId })

    if (approval !== null) {
      await recordApprovalCreated(ctx, approval)
    }

    return { approvalId, code: args.code, expiresAt, reused: false }
  },
})

export const recordDelivery = internalMutation({
  args: {
    approvalId: v.id("approvals"),
    delivery: approvalDelivery,
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (approval === null) {
      return null
    }

    const updated = await recordApprovalDelivery(ctx, approval, args.delivery)

    return updated ?? { ...approval, delivery: args.delivery }
  },
})

export const decide = internalMutation({
  args: {
    approvalId: v.id("approvals"),
    decidedBy: actorValidator,
    decision: approvalDecision,
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (approval === null) {
      return { status: "missing" as const }
    }

    if (approval.status !== "pending") {
      return { status: settledStatus(approval), approval }
    }

    if (Date.now() >= approval.expiresAt) {
      const updated = await markApprovalExpired(ctx, approval)

      return { status: "expired" as const, approval: updated ?? approval }
    }

    const run = await ctx.db.get(approval.runId)

    if (run === null || isTerminalRun(run)) {
      return { status: "closed" as const, approval }
    }

    const updated = await markApprovalDecided(ctx, approval, {
      decidedBy: args.decidedBy,
      decision: args.decision,
      now: Date.now(),
    })

    return {
      status: args.decision,
      approval: updated ?? approval,
    }
  },
})

export const cancel = internalMutation({
  args: {
    approvalId: v.id("approvals"),
    runId: v.id("runs"),
    tenantId: v.string(),
    cancelledBy: v.optional(actorValidator),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (
      approval === null ||
      approval.runId !== args.runId ||
      approval.tenantId !== args.tenantId
    ) {
      return { status: "missing" as const }
    }

    if (approval.status !== "pending") {
      return { status: settledStatus(approval), approval }
    }

    const updated = await markApprovalCancelled(ctx, approval, {
      cancelledBy: args.cancelledBy,
      now: Date.now(),
      reason: args.reason,
    })

    return { status: "cancelled" as const, approval: updated ?? approval }
  },
})

export const expire = internalMutation({
  args: {
    approvalId: v.id("approvals"),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (
      approval === null ||
      approval.status !== "pending" ||
      Date.now() < approval.expiresAt
    ) {
      return null
    }

    const updated = await markApprovalExpired(ctx, approval)

    return updated ?? approval
  },
})

async function findReusableApproval(
  ctx: MutationCtx,
  args: { runId: Doc<"runs">["_id"]; tool: string; inputJson: string }
) {
  const pending = ctx.db
    .query("approvals")
    .withIndex("by_run_and_status", (query) =>
      query.eq("runId", args.runId).eq("status", "pending")
    )

  for await (const approval of pending) {
    if (approval.tool === args.tool && approval.args === args.inputJson) {
      return approval
    }
  }

  return null
}

function settledStatus(approval: Doc<"approvals">) {
  return approval.status === "expired"
    ? ("expired" as const)
    : ("decided" as const)
}

function isTerminalRun(run: Doc<"runs">) {
  return (
    run.status === "completed" ||
    run.status === "failed" ||
    run.status === "stopped"
  )
}
