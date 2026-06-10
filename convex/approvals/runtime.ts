import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx, internalAction } from "../_generated/server"
import { createSlackExpirationResponse } from "../providers/slack/approvalBlocks"
import { type Actor } from "../schemas/actors"
import { postSlackMessage, updateSlackMessage } from "../tools/providers/slack"

export type SlackApprovalDecisionArgs = {
  accountId: string
  actorId?: string
  actorEmail?: string
  channelId: string
  threadTs?: string
  code: string
  decision: "approved" | "denied"
}

export type SlackApprovalDecisionResult = {
  status: "approved" | "denied" | "missing" | "consumed" | "decided" | "expired"
  message: string
  integration?: Doc<"integrations">
  approval?: Doc<"approvals">
}

export const handleSlackDecision = internalAction({
  args: {
    accountId: v.string(),
    actorId: v.optional(v.string()),
    actorEmail: v.optional(v.string()),
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
    const target = await ctx.runQuery(
      internal.approvals.approvals.getExpirationTarget,
      {
        approvalId: args.approvalId,
      }
    )

    if (target === null || target.integration === null) {
      return
    }

    const delivery = target.approval.delivery

    if (delivery?.provider !== "slack") {
      return
    }

    const response = createSlackExpirationResponse(target.approval)

    await updateSlackMessage(target.integration, {
      channel: delivery.data.channelId,
      ts: delivery.data.messageTs,
      text: response.text,
      blocks: response.blocks,
    })
  },
})

export async function decideSlackApproval(
  ctx: ActionCtx,
  args: SlackApprovalDecisionArgs
): Promise<SlackApprovalDecisionResult> {
  const target = await ctx.runQuery(
    internal.approvals.approvals.getSlackDecisionTarget,
    {
      accountId: args.accountId,
      code: args.code,
    }
  )

  if (target === null) {
    return {
      status: "missing",
      message: "Approval could not be found.",
    }
  }

  if (target.approval === null) {
    return {
      status: "missing",
      integration: target.integration,
      message: "No approval found for that request.",
    }
  }

  const decidedBy = createSlackActor(args)

  if (decidedBy === null) {
    return {
      status: "missing",
      integration: target.integration,
      approval: target.approval,
      message: "Approval decisions require a known Slack user.",
    }
  }

  const result = await ctx.runMutation(internal.approvals.approvals.decide, {
    approvalId: target.approval._id,
    decision: args.decision,
    decidedBy,
  })

  if (result.status === "approved") {
    await ctx.scheduler.runAfter(
      0,
      internal.runs.approvals.runApprovedExecution,
      {
        approvalId: target.approval._id,
      }
    )

    return {
      status: "approved",
      integration: target.integration,
      approval: result.approval,
      message: "Approved. Continuing the run.",
    }
  }

  if (result.status === "denied") {
    return {
      status: "denied",
      integration: target.integration,
      approval: result.approval,
      message: "Denied.",
    }
  }

  return {
    status: result.status,
    integration: target.integration,
    approval: result.approval,
    message: decisionStatusMessage(result.status, result.approval),
  }
}

function createSlackActor(args: {
  actorId?: string
  actorEmail?: string
}): Actor | null {
  if (args.actorEmail !== undefined && args.actorEmail !== "") {
    return { email: args.actorEmail }
  }

  if (args.actorId !== undefined && args.actorId !== "") {
    return { provider: "slack", externalId: args.actorId }
  }

  return null
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

function decisionStatusMessage(
  status: "missing" | "consumed" | "decided" | "expired",
  approval?: Doc<"approvals">
) {
  if (status === "expired") {
    return "That approval has expired."
  }

  if (approval?.decision === "approved") {
    return "Already approved."
  }

  if (approval?.decision === "denied") {
    return "Already denied."
  }

  if (status === "decided") {
    return "That approval was already decided."
  }

  if (status === "consumed") {
    return "That approval was already consumed."
  }

  return "Approval could not be found."
}
