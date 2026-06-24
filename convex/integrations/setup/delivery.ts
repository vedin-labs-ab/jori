import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { type ApprovalBrokerContext } from "../../broker/approval"
import { postSlackMessage } from "../../broker/tools/slack"
import {
  getSlackChannelId,
  getSlackMessageTs,
  getSlackThreadTs,
} from "../../providers/slack/data"
import { type Integration } from "../../shared/integrations"
import { createSlackSetupLinkMessage } from "./slack"

export async function tryDeliverSetupOffer(
  ctx: ActionCtx,
  context: ApprovalBrokerContext,
  args: {
    expiresAt: number
    integration: Integration
    setupLinkId: Id<"setupLinks">
    summary: string
    url: string
  }
) {
  return await tryDeliverSlackSetupLink(ctx, context, args)
}

async function tryDeliverSlackSetupLink(
  ctx: ActionCtx,
  context: ApprovalBrokerContext,
  args: {
    expiresAt: number
    integration: Integration
    setupLinkId: Id<"setupLinks">
    summary: string
    url: string
  }
) {
  const target = getSlackTarget(context)

  if (target === null) {
    return { status: "created" as const }
  }

  try {
    const message = createSlackSetupLinkMessage({
      expiresAt: args.expiresAt,
      integration: args.integration,
      setupLinkId: args.setupLinkId,
      summary: args.summary,
      url: args.url,
    })

    const response = await postSlackMessage(target.integration, {
      channel: target.channelId,
      thread_ts: target.threadTs,
      text: message.text,
      blocks: message.blocks,
    })
    const messageTs = readString(response, "ts")

    if (messageTs === undefined) {
      throw new Error("Slack setup offer response is missing ts")
    }

    await ctx.runMutation(internal.integrations.setup.links.recordDelivery, {
      setupLinkId: args.setupLinkId,
      delivery: {
        integration: "slack",
        integrationId: target.integration._id,
        data: {
          channelId: readString(response, "channel") ?? target.channelId,
          messageTs,
          ...(target.threadTs === undefined
            ? {}
            : { threadTs: target.threadTs }),
        },
      },
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

  const channelId = getSlackChannelId(context.input.message.data)

  if (channelId === undefined) {
    return null
  }

  return {
    integration: context.input.integration,
    channelId,
    threadTs:
      getSlackThreadTs(context.input.message.data) ??
      getSlackMessageTs(context.input.message.data),
  }
}

function readString(data: unknown, key: string) {
  if (typeof data !== "object" || data === null || !(key in data)) {
    return undefined
  }

  const value = data[key as keyof typeof data]

  return typeof value === "string" && value !== "" ? value : undefined
}
