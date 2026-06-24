import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { internalAction, internalQuery } from "../_generated/server"
import { syncSlackApprovalSurface } from "./slack/surface"

type ApprovalSurfaceTarget = {
  approval: Doc<"approvals">
  delivery: NonNullable<Doc<"approvals">["delivery"]>
  integration: Doc<"integrations">
}

export const sync = internalAction({
  args: {
    approvalId: v.id("approvals"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const target = (await ctx.runQuery(
      internal.approvals.lifecycle.getSurfaceTarget,
      {
        approvalId: args.approvalId,
      }
    )) as ApprovalSurfaceTarget | null

    if (target === null) {
      return null
    }

    await syncApprovalSurface(target)

    return null
  },
})

export const getSurfaceTarget = internalQuery({
  args: {
    approvalId: v.id("approvals"),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (approval === null || !isSurfaceSyncStatus(approval.status)) {
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
      integration.tenantId !== approval.tenantId ||
      integration.integration !== delivery.integration
    ) {
      return null
    }

    return { approval, delivery, integration }
  },
})

async function syncApprovalSurface(target: ApprovalSurfaceTarget) {
  switch (target.delivery.integration) {
    case "slack":
      await syncSlackApprovalSurface({
        approval: target.approval,
        delivery: target.delivery,
        integration: target.integration,
      })
  }
}

function isSurfaceSyncStatus(status: Doc<"approvals">["status"]) {
  return (
    status === "approved" ||
    status === "cancelled" ||
    status === "denied" ||
    status === "expired"
  )
}
