import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { type ApprovalBrokerContext } from "../../broker/approval"
import {
  postSlackCard,
  slackCardTarget,
} from "../../providers/slack/delivery/cards"
import { type Integration } from "../../shared/integrations"
import { createSlackIntegrationOfferMessage } from "./slack"

export async function tryDeliverIntegrationOffer(
  ctx: ActionCtx,
  context: ApprovalBrokerContext,
  args: {
    expiresAt: number
    integration: Integration
    integrationOfferId: Id<"integrationOffers">
    summary: string
    url: string
  }
) {
  return await tryDeliverSlackIntegrationOffer(ctx, context, args)
}

async function tryDeliverSlackIntegrationOffer(
  ctx: ActionCtx,
  context: ApprovalBrokerContext,
  args: {
    expiresAt: number
    integration: Integration
    integrationOfferId: Id<"integrationOffers">
    summary: string
    url: string
  }
) {
  const target = getSlackTarget(context)

  if (target === null) {
    return { status: "created" as const }
  }

  try {
    const message = createSlackIntegrationOfferMessage({
      expiresAt: args.expiresAt,
      integration: args.integration,
      integrationOfferId: args.integrationOfferId,
      summary: args.summary,
      url: args.url,
    })

    const { delivery, messageTs } = await postSlackCard(
      target.integration,
      target,
      {
        blocks: message.blocks,
        label: "integration offer",
        text: message.text,
      }
    )

    await ctx.runMutation(internal.integrations.offers.updates.recordDelivery, {
      integrationOfferId: args.integrationOfferId,
      delivery,
    })

    return {
      status: "delivered" as const,
      surface: "slack" as const,
      channelId: target.channelId,
      messageTs,
      threadTs: target.threadTs,
    }
  } catch {
    return { status: "created" as const }
  }
}

function getSlackTarget(context: ApprovalBrokerContext) {
  if (context.input.type !== "message") {
    return null
  }

  if (context.input.messageIntegration !== "slack") {
    return null
  }

  const target = slackCardTarget(context.input.message.data)

  return target === null
    ? null
    : { integration: context.input.integration, ...target }
}
