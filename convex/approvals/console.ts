import { v } from "convex/values"
import { internal } from "../_generated/api"
import { action, internalQuery } from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import {
  readClerkUserEmail,
  readClerkUserName,
  requireClerkUserId,
} from "../identity/users"
import { createUserActor } from "../shared/actor"
import { decideApproval } from "./runtime"

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
      approval: target,
      decidedBy: createUserActor(requireClerkUserId(identity), {
        email: readClerkUserEmail(identity),
        name: readClerkUserName(identity),
      }),
      decision: args.decision,
    })

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

    return approval
  },
})
