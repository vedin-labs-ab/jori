import { v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { internalMutation, type QueryCtx } from "../_generated/server"
import {
  activeMessageIntegration,
  findRoutingByMessage,
  hasActiveClaim,
  routingReplyClaimMs,
} from "./data"
import { replyAddress } from "./surface"

export const recordReplyDelivery = internalMutation({
  args: {
    deliveryId: v.string(),
    routingId: v.id("routing"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.routingId, {
      replyClaimUntil: undefined,
      replyError: undefined,
      replyMessageTs: args.deliveryId,
      updatedAt: Date.now(),
    })

    return null
  },
})

export const recordReplyFailure = internalMutation({
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

export const claimFinalReply = internalMutation({
  args: {
    now: v.number(),
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const source = await findRunSource(ctx, args.runId)

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

    const address = replyAddress(source.message)

    if (address === null) {
      return null
    }

    await ctx.db.patch(routing._id, {
      finalReplyClaimUntil: args.now + routingReplyClaimMs,
      finalReplyError: undefined,
      updatedAt: args.now,
    })

    return {
      address,
      integration: source.integration,
      routingId: routing._id,
    }
  },
})

export const recordFinalReplyDelivery = internalMutation({
  args: {
    deliveryId: v.string(),
    routingId: v.id("routing"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.routingId, {
      finalReplyClaimUntil: undefined,
      finalReplyError: undefined,
      finalReplyMessageTs: args.deliveryId,
      updatedAt: Date.now(),
    })

    return null
  },
})

export const releaseFinalReply = internalMutation({
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

async function findRunSource(ctx: QueryCtx, runId: Id<"runs">) {
  const run = await ctx.db.get(runId)

  if (run === null || run.reason.type !== "message") {
    return null
  }

  const message = await ctx.db.get(run.reason.messageId)

  if (message === null) {
    return null
  }

  const integration = await activeMessageIntegration(ctx, message)

  return integration === null ? null : { integration, message }
}
