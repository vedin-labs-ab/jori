import { internal } from "../_generated/api"
import { type ActionCtx } from "../_generated/server"
import { postSlackMessage } from "../broker/tools/slack"
import { readProviderDataString } from "../providers/data"
import { type ReplyTarget, type TextReplyTarget } from "./surface"

export async function deliverTextReply(
  ctx: ActionCtx,
  target: TextReplyTarget
) {
  try {
    const deliveryId = await sendReply(target, target.text)

    await ctx.runMutation(internal.routing.replies.recordReplyDelivery, {
      deliveryId,
      routingId: target.routingId,
    })
  } catch (error) {
    await ctx.runMutation(internal.routing.replies.recordReplyFailure, {
      error: formatDeliveryError(error),
      routingId: target.routingId,
    })
  }
}

export async function deliverFinalReply(
  ctx: ActionCtx,
  content: string,
  target: ReplyTarget
) {
  try {
    const deliveryId = await sendReply(target, content)

    await ctx.runMutation(internal.routing.replies.recordFinalReplyDelivery, {
      deliveryId,
      routingId: target.routingId,
    })

    return { delivered: true }
  } catch (error) {
    await ctx.runMutation(internal.routing.replies.releaseFinalReply, {
      error: formatDeliveryError(error),
      routingId: target.routingId,
    })
    throw error
  }
}

async function sendReply(target: ReplyTarget, text: string) {
  switch (target.address.type) {
    case "slack":
      return await sendSlackReply(target, text)
  }
}

async function sendSlackReply(target: ReplyTarget, text: string) {
  if (target.address.type !== "slack") {
    throw new Error("Reply target is not Slack.")
  }

  const response = await postSlackMessage(target.integration, {
    channel: target.address.channelId,
    text,
    thread_ts: target.address.threadTs,
  })
  const deliveryId = readProviderDataString(response, "ts")

  if (deliveryId === undefined) {
    throw new Error("Slack reply response is missing ts.")
  }

  return deliveryId
}

function formatDeliveryError(error: unknown) {
  return error instanceof Error ? error.message : "Reply delivery failed"
}
