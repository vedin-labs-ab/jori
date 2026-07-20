import { v } from "convex/values"
import { internal } from "../_generated/api"
import { action, internalQuery } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { readUserEmail, readUserName } from "../access/users"
import { ensureCurrentPersonFromAction } from "../persons/account"
import { createPersonActor } from "../shared/actor"
import { decideApproval } from "./runtime"

export const decide = action({
  args: {
    approvalId: v.id("approvals"),
    decision: v.union(v.literal("approved"), v.literal("denied")),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const target = await ctx.runQuery(
      internal.approvals.console.getDecisionTarget,
      {
        approvalId: args.approvalId,
        organizationId: args.organizationId,
      }
    )

    if (target === null) {
      throw new Error("Approval not found.")
    }

    const personId = await ensureCurrentPersonFromAction(
      ctx,
      args.organizationId
    )
    const result = await decideApproval(ctx, {
      approval: target,
      decidedBy: createPersonActor(personId, {
        email: readUserEmail(identity),
        name: readUserName(identity),
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
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (approval === null || approval.organizationId !== args.organizationId) {
      return null
    }

    return approval
  },
})
