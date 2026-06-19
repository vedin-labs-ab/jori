import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import {
  type ActionCtx,
  internalMutation,
  type MutationCtx,
} from "../../_generated/server"
import { setSlackThreadStatus } from "../../broker/tools/slack"
import { formatRuntimeError } from "../shared"

const claimLeaseMs = 2 * 60 * 1000

type SlackTarget = {
  integration: Doc<"integrations">
  status: Doc<"runtimeSlackStatuses">
}

// Called directly from the Slack events HTTP action (not via ctx.runAction) so
// the working status is re-asserted in the fewest hops after a user message
// clears it: one claim mutation, then the setStatus call.
export async function publishWorkingStatus(
  ctx: ActionCtx,
  args: {
    accountId: string
    channelId: string
    threadTs: string
  }
) {
  let target: SlackTarget | null = null

  try {
    target = await claimWorkingTarget(ctx, args)

    if (target === null) {
      return
    }

    await setSlackThreadStatus(target.integration, {
      channelId: target.status.channelId,
      status: "is working...",
      threadTs: target.status.threadTs,
    })
    await ctx.runMutation(internal.runtime.slack.status.recordDelivery, {
      runId: target.status.runId,
      state: "working",
      now: Date.now(),
    })
  } catch (error) {
    if (target === null) {
      return
    }

    await ctx.runMutation(internal.runtime.slack.status.recordFailure, {
      error: formatRuntimeError(error),
      runId: target.status.runId,
      now: Date.now(),
    })
  }
}

export const claimWorking = internalMutation({
  args: {
    accountId: v.string(),
    channelId: v.string(),
    now: v.number(),
    threadTs: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const integration = await findSlackIntegration(ctx, args.accountId)

    if (integration === null) {
      return null
    }

    const status = await findSlackStatus(ctx, {
      channelId: args.channelId,
      integration,
      threadTs: args.threadTs,
    })

    if (status === null || status.state !== "working") {
      return null
    }

    await ctx.db.patch(status._id, {
      lastError: undefined,
      publishClaimUntil: args.now + claimLeaseMs,
      updatedAt: args.now,
    })

    return { integration, status }
  },
})

async function claimWorkingTarget(
  ctx: ActionCtx,
  args: {
    accountId: string
    channelId: string
    threadTs: string
  }
) {
  return (await ctx.runMutation(internal.runtime.slack.target.claimWorking, {
    ...args,
    now: Date.now(),
  })) as SlackTarget | null
}

async function findSlackIntegration(ctx: MutationCtx, accountId: string) {
  const integration = await ctx.db
    .query("integrations")
    .withIndex("by_integration_and_external", (query) =>
      query.eq("integration", "slack").eq("externalId", accountId)
    )
    .first()

  if (
    integration === null ||
    integration.status !== "active" ||
    integration.integration !== "slack"
  ) {
    return null
  }

  return integration
}

async function findSlackStatus(
  ctx: MutationCtx,
  args: {
    channelId: string
    integration: Doc<"integrations">
    threadTs: string
  }
) {
  // A thread accumulates one status row per run; re-assert against the newest.
  return await ctx.db
    .query("runtimeSlackStatuses")
    .withIndex("by_integration_and_channel_and_thread", (query) =>
      query
        .eq("integrationId", args.integration._id)
        .eq("channelId", args.channelId)
        .eq("threadTs", args.threadTs)
    )
    .order("desc")
    .first()
}
