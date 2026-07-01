import { type Doc } from "../_generated/dataModel"
import { getSlackBotUserId, getSlackChannelType } from "../providers/slack/data"

export {
  messageActorIds,
  messageIdentifiers,
  messageReplyTargetIdentifier,
} from "./identifiers"
export {
  type ReplyAddress,
  type ReplyTargetIdentifier,
  replyAddress,
} from "./targets"

export type MessageAudience = {
  isAddressed: boolean
  isDirect: boolean
  isMentioned: boolean
}

export type ConversationVisibility = "private" | "public"

export function messageText(
  message: Doc<"messages">,
  integration: Doc<"integrations">
) {
  const text = message.text ?? ""

  if (message.integration === "slack") {
    return slackMessageText(text, integration)
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

  if (message.integration === "github" || message.integration === "linear") {
    return {
      isAddressed: message.mentioned,
      isDirect: false,
      isMentioned: message.mentioned,
    }
  }

  return {
    isAddressed: false,
    isDirect: false,
    isMentioned: message.mentioned,
  }
}

export function conversationVisibility(
  message: Doc<"messages">,
  integration: Doc<"integrations">
): ConversationVisibility {
  if (integration.integration === "slack") {
    return slackVisibility(message)
  }

  if (
    integration.integration === "github" ||
    integration.integration === "linear"
  ) {
    return "public"
  }

  return "private"
}

function slackMessageAudience(
  message: Doc<"messages">,
  _integration: Doc<"integrations">
): MessageAudience {
  const isDirect = isSlackDirectMessage(message)

  return {
    isAddressed: isDirect || message.mentioned,
    isDirect,
    isMentioned: message.mentioned,
  }
}

function isSlackDirectMessage(message: Doc<"messages">) {
  const channelType = getSlackChannelType(message.type)

  return channelType === "im" || channelType === "mpim"
}

function slackVisibility(message: Doc<"messages">): ConversationVisibility {
  return getSlackChannelType(message.type) === "channel" ? "public" : "private"
}

function slackMessageText(text: string, integration: Doc<"integrations">) {
  const botUserId = getSlackBotUserId(integration.data)

  return botUserId === undefined
    ? text
    : text.replace(slackUserMentionPattern(botUserId), "@Milo")
}

function slackUserMentionPattern(userId: string) {
  return new RegExp(`<@${escapeRegExp(userId)}(?:\\|[^>]+)?>`, "g")
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
