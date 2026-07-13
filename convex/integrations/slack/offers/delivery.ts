import { internal } from "../../../_generated/api"
import { type ActionCtx } from "../../../_generated/server"
import { type OfferContext } from "../../offers/context"
import { type IntegrationOfferDeliveryInput } from "../../offers/delivery"
import { postSlackCard, slackCardTarget } from "../delivery/cards"
import { createSlackIntegrationOfferMessage } from "./card"

export async function tryDeliverSlackIntegrationOffer(
  ctx: ActionCtx,
  context: OfferContext,
  input: IntegrationOfferDeliveryInput
) {
  const target = getSlackTarget(context)

  if (target === null) {
    return { status: "created" as const }
  }

  try {
    const message = createSlackIntegrationOfferMessage({
      expiresAt: input.expiresAt,
      integration: input.integration,
      integrationOfferId: input.integrationOfferId,
      summary: input.summary,
      url: input.url,
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
      integrationOfferId: input.integrationOfferId,
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

function getSlackTarget(context: OfferContext) {
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
