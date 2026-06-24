import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { internalQuery } from "../_generated/server"

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

    return { integration, approval }
  },
})

function isExpiredPendingApproval(approval: Doc<"approvals">) {
  return approval.status === "pending" && Date.now() >= approval.expiresAt
}
