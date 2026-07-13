import { v } from "convex/values"
import { internal } from "../../../_generated/api"
import { type Doc } from "../../../_generated/dataModel"
import { internalAction, internalQuery } from "../../../_generated/server"
import {
  type TerminalIntegrationOfferStatus,
  terminalIntegrationOfferStatus,
} from "../../offers/transition"
import { updateSlackMessage } from "../delivery/messages"
import { createSlackIntegrationOfferMessage } from "./card"

type SurfaceTarget = {
  delivery: Extract<
    Doc<"integrationOffers">["delivery"],
    { integration: "slack" }
  >
  integration: Doc<"integrations">
  offer: Doc<"integrationOffers"> & { status: TerminalIntegrationOfferStatus }
}

export const sync = internalAction({
  args: {
    integrationOfferId: v.id("integrationOffers"),
  },
  handler: async (ctx, args) => {
    const target: SurfaceTarget | null = await ctx.runQuery(
      internal.integrations.slack.offers.surface.getSurfaceTarget,
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

export const getSurfaceTarget = internalQuery({
  args: {
    integrationOfferId: v.id("integrationOffers"),
  },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.integrationOfferId)

    if (offer === null) {
      return null
    }

    const status = terminalIntegrationOfferStatus(offer.status)
    const delivery = offer.delivery

    if (
      status === null ||
      delivery === undefined ||
      delivery.integration !== "slack"
    ) {
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

async function syncSlackSurface(target: SurfaceTarget) {
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
