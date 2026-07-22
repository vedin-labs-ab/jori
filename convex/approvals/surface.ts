import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { internalQuery } from "../_generated/server"
import { isTerminalApprovalStatus } from "./transition"

export type ApprovalSurfaceTarget = {
  approval: Doc<"approvals">
  delivery: NonNullable<Doc<"approvals">["delivery"]>
  integration: Doc<"integrations">
}

export const getTarget = internalQuery({
  args: {
    approvalId: v.id("approvals"),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (approval === null || !isTerminalApprovalStatus(approval.status)) {
      return null
    }

    const delivery = approval.delivery

    if (delivery === undefined) {
      return null
    }

    const integration = await ctx.db.get(delivery.integrationId)

    if (
      integration === null ||
      integration.status !== "active" ||
      integration.organizationId !== approval.organizationId ||
      integration.integration !== "slack"
    ) {
      return null
    }

    return { approval, delivery, integration }
  },
})
