import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { internalAction } from "../_generated/server"
import { type Actor } from "../schemas/actors"
import { callSlackTool } from "../tools/providers/slack"

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
    const target = await ctx.runQuery(
      internal.approvals.approvals.getSlackDecisionTarget,
      {
        accountId: args.accountId,
        code: args.code,
      }
    )

    if (target === null) {
      return
    }

    if (target.approval === null) {
      await postSlackDecisionMessage(
        target.integration,
        args,
        "No approval found for that code."
      )
      return
    }

    const decidedBy = createSlackActor(args)

    if (decidedBy === null) {
      await postSlackDecisionMessage(
        target.integration,
        args,
        "Approval decisions require a known Slack user."
      )
      return
    }

    const result = await ctx.runMutation(internal.approvals.approvals.decide, {
      approvalId: target.approval._id,
      decision: args.decision,
      decidedBy,
    })

    if (result.status === "approved") {
      await postSlackDecisionMessage(
        target.integration,
        args,
        `Approved ${args.code}. Continuing the run.`
      )
      await ctx.scheduler.runAfter(
        0,
        internal.runs.approvals.runApprovedExecution,
        {
          approvalId: target.approval._id,
        }
      )
      return
    }

    if (result.status === "denied") {
      await postSlackDecisionMessage(
        target.integration,
        args,
        `Denied ${args.code}.`
      )
      return
    }

    await postSlackDecisionMessage(
      target.integration,
      args,
      decisionStatusMessage(result.status)
    )
  },
})

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
  await callSlackTool(integration, "conversations_add_message", {
    channel: args.channelId,
    text,
    thread_ts: args.threadTs,
  })
}

function decisionStatusMessage(
  status: "missing" | "consumed" | "decided" | "expired"
) {
  if (status === "expired") {
    return "That approval has expired."
  }

  if (status === "decided") {
    return "That approval was already decided."
  }

  if (status === "consumed") {
    return "That approval was already consumed."
  }

  return "Approval could not be found."
}
