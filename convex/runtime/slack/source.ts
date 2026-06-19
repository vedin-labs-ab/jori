import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"

const claimLeaseMs = 2 * 60 * 1000

export const claimSlackFinal = internalMutation({
  args: {
    now: v.number(),
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const status = await findSlackStatus(ctx, args.runId)

    if (status === null || status.messageTs !== undefined) {
      return null
    }

    requireAvailableReplyClaim(status, args.now)

    const integration = await ctx.db.get(status.integrationId)

    if (!isActiveSlackIntegration(integration)) {
      return null
    }

    await ctx.db.patch(status._id, {
      lastError: undefined,
      replyClaimUntil: args.now + claimLeaseMs,
      updatedAt: args.now,
    })

    return {
      integration,
      status,
    }
  },
})

export const prepareSlackToolMessage = internalMutation({
  args: {
    channelId: v.string(),
    now: v.number(),
    runId: v.id("runs"),
    threadTs: v.optional(v.string()),
  },
  returns: v.object({
    channelId: v.string(),
    recordFinal: v.boolean(),
    source: v.boolean(),
    threadTs: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const status = await findSlackStatus(ctx, args.runId)

    if (!isSourceSlackTarget(status, args)) {
      return {
        channelId: args.channelId,
        recordFinal: false,
        source: false,
        ...(args.threadTs === undefined ? {} : { threadTs: args.threadTs }),
      }
    }

    const recordFinal = status.messageTs === undefined

    if (recordFinal) {
      requireAvailableReplyClaim(status, args.now)
    }

    await ctx.db.patch(status._id, {
      lastError: undefined,
      ...(recordFinal ? { replyClaimUntil: args.now + claimLeaseMs } : {}),
      updatedAt: args.now,
    })

    return {
      channelId: status.channelId,
      recordFinal,
      source: true,
      threadTs: status.threadTs,
    }
  },
})

export const recordSlackFinal = internalMutation({
  args: {
    messageTs: v.string(),
    now: v.number(),
    runId: v.id("runs"),
    statusCleared: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const status = await findSlackStatus(ctx, args.runId)

    if (status === null) {
      return null
    }

    await ctx.db.patch(status._id, {
      deliveredAt: args.statusCleared ? args.now : status.deliveredAt,
      lastDeliveredState: args.statusCleared
        ? "completed"
        : status.lastDeliveredState,
      lastError: undefined,
      messageTs: args.messageTs,
      publishClaimUntil: undefined,
      replyClaimUntil: undefined,
      state: "completed",
      updatedAt: args.now,
    })

    return null
  },
})

export const releaseSlackFinalClaim = internalMutation({
  args: {
    error: v.optional(v.string()),
    now: v.number(),
    runId: v.id("runs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const status = await findSlackStatus(ctx, args.runId)

    if (status === null) {
      return null
    }

    await ctx.db.patch(status._id, {
      ...(args.error === undefined ? {} : { lastError: args.error }),
      replyClaimUntil: undefined,
      updatedAt: args.now,
    })

    return null
  },
})

async function findSlackStatus(ctx: MutationCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("runtimeSlackStatuses")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .first()
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

function hasActiveReplyClaim(status: Doc<"runtimeSlackStatuses">, now: number) {
  return status.replyClaimUntil !== undefined && status.replyClaimUntil > now
}

function requireAvailableReplyClaim(
  status: Doc<"runtimeSlackStatuses">,
  now: number
) {
  if (hasActiveReplyClaim(status, now)) {
    throw new Error("Slack source reply is already claimed")
  }
}

function isSourceSlackTarget(
  status: Doc<"runtimeSlackStatuses"> | null,
  args: {
    channelId: string
    threadTs?: string
  }
): status is Doc<"runtimeSlackStatuses"> {
  return (
    status !== null &&
    status.channelId === args.channelId &&
    (args.threadTs === undefined || args.threadTs === status.threadTs)
  )
}
