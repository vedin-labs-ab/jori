import { type Doc, type Id } from "../_generated/dataModel"
import { readProviderDataString } from "../providers/data"
import { getSlackBotId, getSlackChannelType } from "../providers/slack/data"

export type MessageAudience = {
  isAddressed: boolean
  isDirect: boolean
}

export type ReplyAddress = {
  channelId: string
  threadTs: string
  type: "slack"
}

export type ReplyTarget = {
  address: ReplyAddress
  integration: Doc<"integrations">
  routingId: Id<"routing">
}

export type TextReplyTarget = ReplyTarget & {
  text: string
}

export function routingMessageText(
  message: Doc<"messages">,
  integration: Doc<"integrations">
) {
  const text = message.text ?? ""

  if (message.integration === "slack") {
    return slackRoutingMessageText(text, integration)
  }

  return text
}

export function messageAudience(
  message: Doc<"messages">,
  integration: Doc<"integrations">
): MessageAudience {
  if (message.integration === "slack") {
    return slackMessageAudience(message, integration)
  }

  return { isAddressed: false, isDirect: false }
}

export function replyAddress(message: Doc<"messages">): ReplyAddress | null {
  if (message.integration === "slack") {
    return slackReplyAddress(message)
  }

  return null
}

function slackMessageAudience(
  message: Doc<"messages">,
  integration: Doc<"integrations">
): MessageAudience {
  const isDirect =
    message.type === "message.im" || getSlackChannelType(message.data) === "im"

  return {
    isAddressed: isDirect || isSlackMention(message, integration),
    isDirect,
  }
}

function isSlackMention(
  message: Doc<"messages">,
  integration: Doc<"integrations">
) {
  if (message.type === "app_mention") {
    return true
  }

  const botId = getSlackBotId(integration.data)

  return botId !== undefined && (message.text ?? "").includes(`<@${botId}>`)
}

function slackRoutingMessageText(
  text: string,
  integration: Doc<"integrations">
) {
  const botId = getSlackBotId(integration.data)

  return botId === undefined
    ? text
    : text.replace(slackUserMentionPattern(botId), "@Milo")
}

function slackUserMentionPattern(userId: string) {
  return new RegExp(`<@${escapeRegExp(userId)}(?:\\|[^>]+)?>`, "g")
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function slackReplyAddress(message: Doc<"messages">): ReplyAddress | null {
  const channelId = readProviderDataString(message.data, "channelId")
  const messageTs = readProviderDataString(message.data, "ts")

  if (channelId === undefined || messageTs === undefined) {
    return null
  }

  return {
    channelId,
    type: "slack",
    threadTs: readProviderDataString(message.data, "threadTs") ?? messageTs,
  }
}
