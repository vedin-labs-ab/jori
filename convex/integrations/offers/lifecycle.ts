import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { internalAction, internalMutation } from "../../_generated/server"
import {
  markIntegrationOfferCancelled,
  markIntegrationOfferExpired,
  terminalIntegrationOfferStatus,
} from "./transition"

export const expire = internalAction({
  args: {
    integrationOfferId: v.id("integrationOffers"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.integrations.offers.lifecycle.markExpired, {
      integrationOfferId: args.integrationOfferId,
    })
  },
})

export const markExpired = internalMutation({
  args: {
    integrationOfferId: v.id("integrationOffers"),
  },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.integrationOfferId)

    if (
      offer === null ||
      terminalIntegrationOfferStatus(offer.status) !== null ||
      Date.now() < offer.expiresAt
    ) {
      return null
    }

    await markIntegrationOfferExpired(ctx, offer, Date.now())

    return null
  },
})

export const cancelForRun = internalMutation({
  args: {
    integrationOfferId: v.id("integrationOffers"),
    runId: v.id("runs"),
    organizationId: v.string(),
    reason: v.string(),
  },
  returns: v.object({
    status: v.union(
      v.literal("cancelled"),
      v.literal("missing"),
      v.literal("settled")
    ),
  }),
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.integrationOfferId)

    if (
      offer === null ||
      offer.runId !== args.runId ||
      offer.organizationId !== args.organizationId
    ) {
      return { status: "missing" as const }
    }

    if (offer.status !== "pending" && offer.status !== "claimed") {
      return { status: "settled" as const }
    }

    await markIntegrationOfferCancelled(ctx, offer, {
      actor: undefined,
      reason: args.reason,
      now: Date.now(),
    })

    return { status: "cancelled" as const }
  },
})
