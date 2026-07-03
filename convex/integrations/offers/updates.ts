import { v } from "convex/values"
import { internalMutation } from "../../_generated/server"
import { messageDeliveryValidator } from "../../shared/integrations"
import {
  markIntegrationOfferConnected,
  markIntegrationOfferFailed,
  recordIntegrationOfferDelivery,
} from "./transition"

export const complete = internalMutation({
  args: {
    integrationOfferId: v.optional(v.id("integrationOffers")),
    integrationId: v.optional(v.id("integrations")),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.integrationOfferId === undefined) {
      return null
    }

    const offer = await ctx.db.get(args.integrationOfferId)

    if (offer === null) {
      return null
    }

    const now = Date.now()

    if (args.integrationId !== undefined) {
      await markIntegrationOfferConnected(ctx, offer, {
        integrationId: args.integrationId,
        now,
      })

      return null
    }

    await markIntegrationOfferFailed(ctx, offer, {
      error: args.error ?? "Provider authorization failed.",
      now,
    })

    return null
  },
})

export const recordDelivery = internalMutation({
  args: {
    integrationOfferId: v.id("integrationOffers"),
    delivery: messageDeliveryValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.integrationOfferId)

    if (offer === null) {
      return null
    }

    await recordIntegrationOfferDelivery(ctx, offer, args.delivery)

    return null
  },
})
