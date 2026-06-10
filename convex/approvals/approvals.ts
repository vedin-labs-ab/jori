import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server"
import { providerValidator } from "../providers/catalog"
import { actorValidator } from "../schemas/actors"
import {
  approvalDecision,
  approvalDelivery,
  approvalHandoff,
} from "../schemas/approvals"

const approvalTtlMs = 30 * 60 * 1000

export const create = internalMutation({
  args: {
    tenantId: v.string(),
    executionId: v.id("executions"),
    provider: providerValidator,
    tool: v.string(),
    args: v.any(),
    summary: v.string(),
    handoff: approvalHandoff,
    code: v.string(),
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
      integration.provider !== delivery.provider
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
      .withIndex("by_provider_account", (query) =>
        query.eq("provider", "slack").eq("accountId", args.accountId)
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

    if (approval.consumedAt !== undefined) {
      return { status: "consumed" as const, approval }
    }

    if (approval.decision !== undefined) {
      return { status: "decided" as const, approval }
    }

    if (Date.now() > approval.expiresAt) {
      return { status: "expired" as const, approval }
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

export const claimApproved = internalMutation({
  args: {
    approvalId: v.id("approvals"),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (!isReadyToConsume(approval)) {
      return null
    }

    await ctx.db.patch(approval._id, {
      consumedAt: Date.now(),
    })

    return approval
  },
})

function isReadyToConsume(
  approval: Doc<"approvals"> | null
): approval is Doc<"approvals"> {
  return (
    approval !== null &&
    approval.decision === "approved" &&
    approval.consumedAt === undefined &&
    Date.now() <= approval.expiresAt
  )
}

function isExpiredPendingApproval(approval: Doc<"approvals">) {
  return (
    approval.decision === undefined &&
    approval.consumedAt === undefined &&
    Date.now() > approval.expiresAt
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
