import { v } from "convex/values"
import { approvalTtlMs } from "../../contracts/approvals"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { wakeRun } from "../runtime/waiters/data"
import { actorValidator } from "../shared/actor"
import { toolSurfaceValidator } from "../shared/integrations"
import { approvalDecision, approvalDelivery } from "./schema"

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

    await ctx.db.patch(approvalId, { functionId })

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

    await ctx.db.patch(approval._id, { delivery: args.delivery })

    return { ...approval, delivery: args.delivery }
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
      return { status: "expired" as const, approval }
    }

    const run = await ctx.db.get(approval.runId)

    if (run === null || isTerminalRun(run)) {
      return { status: "closed" as const, approval }
    }

    await cancelApprovalFunction(ctx, approval)
    const decidedAt = Date.now()

    await ctx.db.patch(approval._id, {
      status: args.decision,
      decidedBy: args.decidedBy,
      decidedAt,
      functionId: undefined,
    })
    await wakeApprovalRun(ctx, approval)

    return {
      status: args.decision,
      approval: {
        ...approval,
        status: args.decision,
        decidedBy: args.decidedBy,
      },
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

    await cancelApprovalFunction(ctx, approval)
    await ctx.db.patch(approval._id, {
      status: "cancelled",
      cancelReason: args.reason,
      cancelledBy: args.cancelledBy,
      functionId: undefined,
    })
    await wakeApprovalRun(ctx, approval)

    return { status: "cancelled" as const, approval }
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

    await ctx.db.patch(approval._id, {
      status: "expired",
      functionId: undefined,
    })
    await wakeApprovalRun(ctx, approval)

    return approval
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

async function wakeApprovalRun(ctx: MutationCtx, approval: Doc<"approvals">) {
  await wakeRun(ctx, {
    runId: approval.runId,
    reason: "approval_resolved",
    subject: { kind: "approval", approvalId: approval._id },
  })
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

async function cancelApprovalFunction(
  ctx: MutationCtx,
  approval: Doc<"approvals">
) {
  if (approval.functionId === undefined) {
    return
  }

  await ctx.scheduler.cancel(approval.functionId)
}
