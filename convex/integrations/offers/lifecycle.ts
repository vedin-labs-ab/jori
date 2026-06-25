import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server"
import { updateSlackMessage } from "../../broker/tools/slack"
import { actorValidator } from "../../shared/actor"
import { createSlackIntegrationOfferMessage } from "./slack"
import {
  markIntegrationOfferCancelled,
  markIntegrationOfferExpired,
} from "./transition"

type TerminalIntegrationOfferStatus =
  | "cancelled"
  | "connected"
  | "expired"
  | "failed"

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

export const sync = internalAction({
  args: {
    integrationOfferId: v.id("integrationOffers"),
  },
  handler: async (ctx, args) => {
    const target = await ctx.runQuery(
      internal.integrations.offers.lifecycle.getSurfaceTarget,
      {
        integrationOfferId: args.integrationOfferId,
      }
    )

    if (target === null) {
      return
    }

    await syncSlackSurface(target)
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
      terminalStatus(offer.status) !== null ||
      Date.now() < offer.expiresAt
    ) {
      return null
    }

    await markIntegrationOfferExpired(ctx, offer, Date.now())

    return null
  },
})

export const cancel = internalMutation({
  args: {
    accountId: v.string(),
    actor: v.optional(actorValidator),
    channelId: v.string(),
    messageTs: v.string(),
    integrationOfferId: v.id("integrationOffers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.integrationOfferId)

    if (offer === null) {
      return null
    }

    const delivery = offer.delivery

    if (
      delivery?.integration !== "slack" ||
      delivery.data.channelId !== args.channelId ||
      delivery.data.messageTs !== args.messageTs
    ) {
      return null
    }

    const integration = await ctx.db.get(delivery.integrationId)

    if (
      integration === null ||
      integration.integration !== delivery.integration ||
      integration.externalId !== args.accountId
    ) {
      return null
    }

    await markIntegrationOfferCancelled(ctx, offer, {
      actor: args.actor,
      now: Date.now(),
    })

    return null
  },
})

export const cancelForRun = internalMutation({
  args: {
    integrationOfferId: v.id("integrationOffers"),
    runId: v.id("runs"),
    tenantId: v.string(),
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
      offer.tenantId !== args.tenantId
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

export const getSurfaceTarget = internalQuery({
  args: {
    integrationOfferId: v.id("integrationOffers"),
  },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.integrationOfferId)

    if (offer === null) {
      return null
    }

    const status = terminalStatus(offer.status)
    const delivery = offer.delivery

    if (status === null || delivery === undefined) {
      return null
    }

    const integration = await ctx.db.get(delivery.integrationId)

    if (
      integration === null ||
      integration.status !== "active" ||
      integration.tenantId !== offer.tenantId ||
      integration.integration !== delivery.integration
    ) {
      return null
    }

    return { delivery, integration, offer: { ...offer, status } }
  },
})

async function syncSlackSurface(target: {
  delivery: Extract<
    Doc<"integrationOffers">["delivery"],
    { integration: "slack" }
  >
  integration: Doc<"integrations">
  offer: Doc<"integrationOffers"> & { status: TerminalIntegrationOfferStatus }
}) {
  const message = createSlackIntegrationOfferMessage({
    expiresAt: target.offer.expiresAt,
    integration: target.offer.integration,
    actor: target.offer.result?.actor,
    status: target.offer.status,
    summary: target.offer.summary ?? "Milo requested this integration.",
    updatedAt: target.offer.updatedAt,
  })

  await updateSlackMessage(target.integration, {
    channel: target.delivery.data.channelId,
    ts: target.delivery.data.messageTs,
    text: message.text,
    blocks: message.blocks,
  })
}

function terminalStatus(
  status: Doc<"integrationOffers">["status"]
): TerminalIntegrationOfferStatus | null {
  if (
    status === "cancelled" ||
    status === "connected" ||
    status === "expired" ||
    status === "failed"
  ) {
    return status
  }

  return null
}
