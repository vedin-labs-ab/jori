import { type Doc } from "../_generated/dataModel"
import { getSlackBotUserId } from "../providers/slack/data"

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

function slackMessageAudience(
  message: Doc<"messages">,
  _integration: Doc<"integrations">
): MessageAudience {
  const isDirect = isSlackDirectMessage(message.type)

  return {
    isAddressed: isDirect || message.mentioned,
    isDirect,
    isMentioned: message.mentioned,
  }
}

function isSlackDirectMessage(type: string) {
  return type === "message.im" || type === "message.mpim"
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
