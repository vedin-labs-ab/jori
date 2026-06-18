import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalAction,
  internalMutation,
  type MutationCtx,
} from "../_generated/server"
import { setSlackThreadStatus } from "../broker/tools/slack"
import { formatRuntimeError } from "./shared"

const claimLeaseMs = 2 * 60 * 1000

type SlackReplyClearTarget = {
  integration: Doc<"integrations">
  status: Doc<"runtimeSlackStatuses">
}

export const clearForReply = internalAction({
  args: {
    channelId: v.string(),
    runId: v.id("runs"),
    threadTs: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const target = (await ctx.runMutation(internal.runtime.reply.claimClear, {
      ...args,
      now: Date.now(),
    })) as SlackReplyClearTarget | null

    if (target === null) {
      return null
    }

    try {
      await setSlackThreadStatus(target.integration, {
        channelId: target.status.channelId,
        status: "",
        threadTs: target.status.threadTs,
      })
      await ctx.runMutation(internal.runtime.slack.recordDelivery, {
        runId: args.runId,
        state: "completed",
        now: Date.now(),
      })
    } catch (error) {
      await ctx.runMutation(internal.runtime.slack.recordFailure, {
        error: formatRuntimeError(error),
        runId: args.runId,
        now: Date.now(),
      })
    }

    return null
  },
})

export const claimClear = internalMutation({
  args: {
    channelId: v.string(),
    now: v.number(),
    runId: v.id("runs"),
    threadTs: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const status = await findSlackStatus(ctx, args.runId)

    if (status === null || !matchesReplyTarget(status, args)) {
      return null
    }

    const integration = await ctx.db.get(status.integrationId)

    if (!isActiveSlackIntegration(integration)) {
      return null
    }

    await ctx.db.patch(status._id, {
      lastError: undefined,
      publishClaimUntil: args.now + claimLeaseMs,
      state: "completed",
      updatedAt: args.now,
    })

    return {
      integration,
      status: { ...status, state: "completed" },
    }
  },
})

async function findSlackStatus(ctx: MutationCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("runtimeSlackStatuses")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .first()
}

function matchesReplyTarget(
  status: Doc<"runtimeSlackStatuses">,
  args: {
    channelId: string
    threadTs: string
  }
) {
  return (
    status.state === "working" &&
    status.channelId === args.channelId &&
    status.threadTs === args.threadTs
  )
}

function isActiveSlackIntegration(
  integration: Doc<"integrations"> | null
): integration is Doc<"integrations"> {
  return (
    integration !== null &&
    integration.status === "active" &&
    integration.integration === "slack"
  )
}
