import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx, internalAction } from "../_generated/server"
import { type Actor, actorValidator } from "../shared/actor"
import {
  type Integration,
  integrationLabel,
  integrationValidator,
} from "../shared/integrations"
import { type ApprovalDecisionResult, approvalDecisionMessage } from "./result"

export type ApprovalDecision = "approved" | "denied"

export type AccountApprovalDecisionArgs = {
  accountId: string
  actor?: Actor
  integration: Integration
  code: string
  decision: ApprovalDecision
}

export const handleTextDecision = internalAction({
  args: {
    accountId: v.string(),
    actor: v.optional(actorValidator),
    integration: integrationValidator,
    code: v.string(),
    decision: v.union(v.literal("approved"), v.literal("denied")),
  },
  handler: async (ctx, args) => {
    return await decideApprovalByAccount(ctx, args)
  },
})

export const expireApproval = internalAction({
  args: {
    approvalId: v.id("approvals"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.approvals.approvals.expire, {
      approvalId: args.approvalId,
    })
  },
})

export function isApprovalDecisionText(text: string | undefined) {
  return parseApprovalDecisionText(text) !== null
}

export function parseApprovalDecisionText(text: string | undefined) {
  const match = text?.match(/^\s*(approve|deny)\s+([A-Za-z0-9]{6,})\s*$/i)

  if (match === undefined || match === null) {
    return null
  }

  return {
    decision: match[1].toLowerCase() === "approve" ? "approved" : "denied",
    code: normalizeApprovalCode(match[2]),
  } as const
}

export async function decideApprovalByAccount(
  ctx: ActionCtx,
  args: AccountApprovalDecisionArgs
): Promise<ApprovalDecisionResult> {
  const target = await ctx.runQuery(
    internal.approvals.queries.getDecisionTarget,
    {
      accountId: args.accountId,
      code: normalizeApprovalCode(args.code),
      integration: args.integration,
    }
  )

  if (target === null) {
    return {
      status: "missing",
      message: "That approval request no longer exists.",
    }
  }

  if (target.approval === null) {
    return {
      status: "missing",
      integration: target.integration,
      message: "That approval request no longer exists.",
    }
  }

  if (args.actor === undefined) {
    return {
      status: "missing",
      integration: target.integration,
      approval: target.approval,
      message: `Couldn't identify the ${integrationLabel(args.integration)} user, so the decision wasn't recorded.`,
    }
  }

  return await decideApproval(ctx, {
    approval: target.approval,
    decidedBy: args.actor,
    decision: args.decision,
    integration: target.integration,
  })
}

export async function decideApproval(
  ctx: ActionCtx,
  args: {
    approval: Doc<"approvals">
    decidedBy: Actor
    decision: ApprovalDecision
    integration?: Doc<"integrations">
  }
): Promise<ApprovalDecisionResult> {
  const result = await ctx.runMutation(internal.approvals.approvals.decide, {
    approvalId: args.approval._id,
    decision: args.decision,
    decidedBy: args.decidedBy,
  })

  return {
    status: result.status,
    integration: args.integration,
    approval: result.approval,
    message: approvalDecisionMessage(result.status, result.approval),
  }
}

function normalizeApprovalCode(code: string) {
  return code.trim().toUpperCase()
}
