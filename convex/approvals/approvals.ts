import { v } from "convex/values"
import { approvalTtlMs } from "../../contracts/approvals"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server"
import { actorValidator } from "../shared/actor"
import { toolSurfaceValidator } from "../shared/integrations"
import { approvalDecision, approvalDelivery, approvalHandoff } from "./schema"

export const create = internalMutation({
  args: {
    tenantId: v.string(),
    runId: v.id("runs"),
    surface: toolSurfaceValidator,
    tool: v.string(),
    args: v.any(),
    summary: v.string(),
    handoff: approvalHandoff,
    code: v.string(),
    waitpointTokenId: v.optional(v.string()),
    requestedBy: actorValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("approvals")
      .withIndex("by_tenant_and_code", (query) =>
        query.eq("tenantId", args.tenantId).eq("code", args.code)
      )
      .first()

    if (existing !== null) {
      throw new Error("Approval code collision")
    }

    const now = Date.now()

    const expiresAt = now + approvalTtlMs
    const approvalId = await ctx.db.insert("approvals", {
      ...args,
      createdAt: now,
      expiresAt,
    })
    const functionId = await ctx.scheduler.runAt(
      expiresAt,
      internal.approvals.runtime.expireApproval,
      {
        approvalId,
      }
    )

    await ctx.db.patch(approvalId, { functionId })

    return { approvalId, expiresAt }
  },
})

export const get = internalQuery({
  args: {
    approvalId: v.id("approvals"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.approvalId)
  },
})

export const getExpirationTarget = internalQuery({
  args: {
    approvalId: v.id("approvals"),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (approval === null || !isExpiredPendingApproval(approval)) {
      return null
    }

    const delivery = approval.delivery

    if (delivery === undefined) {
      return { approval, integration: null }
    }

    const integration = await ctx.db.get(delivery.integrationId)

    if (
      integration === null ||
      integration.status !== "active" ||
      integration.tenantId !== approval.tenantId ||
      integration.integration !== delivery.integration
    ) {
      return { approval, integration: null }
    }

    return { approval, integration }
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

    await ctx.db.patch(approval._id, {
      delivery: args.delivery,
    })

    return { ...approval, delivery: args.delivery }
  },
})

export const getSlackDecisionTarget = internalQuery({
  args: {
    accountId: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_integration_and_external", (query) =>
        query.eq("integration", "slack").eq("externalId", args.accountId)
      )
      .first()

    if (integration === null || integration.status !== "active") {
      return null
    }

    const approval = await ctx.db
      .query("approvals")
      .withIndex("by_tenant_and_code", (query) =>
        query.eq("tenantId", integration.tenantId).eq("code", args.code)
      )
      .first()

    if (approval === null) {
      return { integration, approval: null }
    }

    return { integration, approval }
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

    if (approval.decision !== undefined) {
      return { status: "decided" as const, approval }
    }

    if (approval.consumedAt !== undefined) {
      return { status: "consumed" as const, approval }
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
      decision: args.decision,
      decidedBy: args.decidedBy,
      decidedAt,
      functionId: undefined,
    })

    return {
      status: args.decision,
      approval: {
        ...approval,
        decision: args.decision,
        decidedBy: args.decidedBy,
        decidedAt,
        functionId: undefined,
      },
    }
  },
})

function isPendingApproval(approval: Doc<"approvals">) {
  return approval.decision === undefined && approval.consumedAt === undefined
}

function isExpiredPendingApproval(approval: Doc<"approvals">) {
  return isPendingApproval(approval) && Date.now() >= approval.expiresAt
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
