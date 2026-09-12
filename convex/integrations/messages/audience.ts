import { type Doc } from "../../_generated/dataModel"
import { type Audience } from "../../shared/audience"
import { getSlackChannelType } from "../slack/data"

type MessageAudience = {
  isAddressed: boolean
  isDirect: boolean
  isMentioned: boolean
}

export function messageAudience(message: Doc<"messages">): MessageAudience {
  switch (message.surface) {
    case "console":
      // Typing to Jori in the console is always a direct address.
      return { isAddressed: true, isDirect: true, isMentioned: true }
    case "slack":
      return slackMessageAudience(message)
    case "github":
    case "linear":
      return {
        isAddressed: message.mentioned,
        isDirect: false,
        isMentioned: message.mentioned,
      }
  }
}

export function conversationScope(message: Doc<"messages">): Audience {
  switch (message.surface) {
    case "console":
      return "person"
    case "slack":
      return slackConversationScope(message)
    case "github":
    case "linear":
      return "organization"
  }
}

function slackMessageAudience(message: Doc<"messages">): MessageAudience {
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

function slackConversationScope(message: Doc<"messages">): Audience {
  const channelType = getSlackChannelType(message.type)

  if (channelType === "channel") {
    return "organization"
  }

  return channelType === "im" ? "person" : "conversation"
}
