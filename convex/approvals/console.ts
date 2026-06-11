import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { action, internalQuery } from "../_generated/server"
import { updateSlackMessage } from "../broker/providers/slack"
import {
  readClerkUserEmail,
  readClerkUserName,
  requireClerkUserId,
} from "../identity/users"
import { createSlackConsoleDecisionResponse } from "../providers/slack/approval/blocks"
import { createUserActor } from "../shared/actor"
import { requireTenantAccess } from "../skills/access"
import { decideApproval, type SlackApprovalDecisionResult } from "./runtime"

export const decide = action({
  args: {
    approvalId: v.id("approvals"),
    decision: v.union(v.literal("approved"), v.literal("denied")),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const target = await ctx.runQuery(
      internal.approvals.console.getDecisionTarget,
      {
        approvalId: args.approvalId,
        tenantId: args.tenantId,
      }
    )

    if (target === null) {
      throw new Error("Approval not found.")
    }

    const result = await decideApproval(ctx, {
      approval: target.approval,
      decidedBy: createUserActor(requireClerkUserId(identity), {
        email: readClerkUserEmail(identity),
        name: readClerkUserName(identity),
      }),
      decision: args.decision,
      integration: target.integration ?? undefined,
    })

    await updateDeliveredApproval(target, result)

    return {
      message: result.message,
      status: result.status,
    }
  },
})

export const getDecisionTarget = internalQuery({
  args: {
    approvalId: v.id("approvals"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (approval === null || approval.tenantId !== args.tenantId) {
      return null
    }

    const delivery = approval.delivery

    if (delivery?.provider !== "slack") {
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

async function updateDeliveredApproval(
  target: {
    approval: Doc<"approvals">
    integration: Doc<"integrations"> | null
  },
  result: SlackApprovalDecisionResult
) {
  const delivery = target.approval.delivery

  if (target.integration === null || delivery?.provider !== "slack") {
    return
  }

  const response = createSlackConsoleDecisionResponse(result)

  await updateSlackMessage(target.integration, {
    channel: delivery.data.channelId,
    ts: delivery.data.messageTs,
    text: response.text,
    blocks: response.blocks,
  })
}
