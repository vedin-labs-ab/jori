import { v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { internalMutation, type QueryCtx } from "../_generated/server"
import {
  activeSlackIntegration,
  findRoutingByMessage,
  hasActiveClaim,
  routingReplyClaimMs,
  slackReplyTarget,
} from "./data"

export const recordSlackReply = internalMutation({
  args: {
    messageTs: v.string(),
    routingId: v.id("routing"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.routingId, {
      replyClaimUntil: undefined,
      replyError: undefined,
      replyMessageTs: args.messageTs,
      updatedAt: Date.now(),
    })

    return null
  },
})

export const recordSlackReplyFailure = internalMutation({
  args: {
    error: v.string(),
    routingId: v.id("routing"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.routingId, {
      replyClaimUntil: undefined,
      replyError: args.error,
      updatedAt: Date.now(),
    })

    return null
  },
})

export const claimFinalSlackReply = internalMutation({
  args: {
    now: v.number(),
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const source = await findSlackRunSource(ctx, args.runId)

    if (source === null) {
      return null
    }

    const routing = await findRoutingByMessage(ctx, source.message._id)

    if (
      routing === null ||
      routing.route !== "agent" ||
      routing.finalReplyMessageTs !== undefined ||
      hasActiveClaim(routing.finalReplyClaimUntil, args.now)
    ) {
      return null
    }

    const target = slackReplyTarget(source.message)

    if (target === null) {
      return null
    }

    await ctx.db.patch(routing._id, {
      finalReplyClaimUntil: args.now + routingReplyClaimMs,
      finalReplyError: undefined,
      updatedAt: args.now,
    })

    return {
      ...target,
      integration: source.integration,
      routingId: routing._id,
    }
  },
})

export const recordFinalSlackReply = internalMutation({
  args: {
    messageTs: v.string(),
    routingId: v.id("routing"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.routingId, {
      finalReplyClaimUntil: undefined,
      finalReplyError: undefined,
      finalReplyMessageTs: args.messageTs,
      updatedAt: Date.now(),
    })

    return null
  },
})

export const releaseFinalSlackReply = internalMutation({
  args: {
    error: v.string(),
    routingId: v.id("routing"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.routingId, {
      finalReplyClaimUntil: undefined,
      finalReplyError: args.error,
      updatedAt: Date.now(),
    })

    return null
  },
})

async function findSlackRunSource(ctx: QueryCtx, runId: Id<"runs">) {
  const run = await ctx.db.get(runId)

  if (run === null || run.reason.type !== "message") {
    return null
  }

  const message = await ctx.db.get(run.reason.messageId)

  if (message === null || message.integration !== "slack") {
    return null
  }

  const integration = await activeSlackIntegration(ctx, message.integrationId)

  return integration === null ? null : { integration, message }
}
