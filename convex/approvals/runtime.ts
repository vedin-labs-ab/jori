import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx, internalAction } from "../_generated/server"
import { postSlackMessage } from "../broker/tools/slack"
import { type Actor, actorValidator } from "../shared/actor"
import { type ApprovalDecisionResult, approvalDecisionMessage } from "./result"

export type SlackApprovalDecisionArgs = {
  accountId: string
  actor?: Actor
  channelId: string
  threadTs?: string
  code: string
  decision: "approved" | "denied"
}

export const handleSlackDecision = internalAction({
  args: {
    accountId: v.string(),
    actor: v.optional(actorValidator),
    channelId: v.string(),
    threadTs: v.optional(v.string()),
    code: v.string(),
    decision: v.union(v.literal("approved"), v.literal("denied")),
  },
  handler: async (ctx, args) => {
    const result = await decideSlackApproval(ctx, args)

    if (result.integration === undefined) {
      return
    }

    await postSlackDecisionMessage(result.integration, args, result.message)
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

export async function decideSlackApproval(
  ctx: ActionCtx,
  args: SlackApprovalDecisionArgs
): Promise<ApprovalDecisionResult> {
  const target = await ctx.runQuery(
    internal.approvals.queries.getSlackDecisionTarget,
    {
      accountId: args.accountId,
      code: args.code,
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
      message:
        "Couldn't identify the Slack user, so the decision wasn't recorded.",
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
    decision: "approved" | "denied"
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

async function postSlackDecisionMessage(
  integration: Doc<"integrations">,
  args: {
    channelId: string
    threadTs?: string
  },
  text: string
) {
  await postSlackMessage(integration, {
    channel: args.channelId,
    text,
    thread_ts: args.threadTs,
  })
}
