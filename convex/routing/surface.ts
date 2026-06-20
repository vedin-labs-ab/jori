import { type Doc, type Id } from "../_generated/dataModel"
import {
  getSlackBotUserId,
  getSlackChannelId,
  getSlackMessageTs,
  getSlackThreadTs,
} from "../providers/slack/data"
import { readDataNumber, readDataObject, readDataString } from "../shared/data"

export type MessageAudience = {
  isAddressed: boolean
  isDirect: boolean
}

export type ReplyAddress =
  | {
      type: "github"
      kind: "issue" | "review"
      owner: string
      repo: string
      issueNumber?: number
      pullNumber?: number
      commentId?: string
    }
  | {
      type: "linear"
      issueId: string
    }
  | {
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

  if (message.integration === "github" || message.integration === "linear") {
    return {
      isAddressed: message.mentioned,
      isDirect: false,
    }
  }

  return { isAddressed: false, isDirect: false }
}

export function replyAddress(message: Doc<"messages">): ReplyAddress | null {
  if (message.integration === "github") {
    return githubReplyAddress(message)
  }

  if (message.integration === "linear") {
    return linearReplyAddress(message)
  }

  if (message.integration === "slack") {
    return slackReplyAddress(message)
  }

  return null
}

function slackMessageAudience(
  message: Doc<"messages">,
  _integration: Doc<"integrations">
): MessageAudience {
  const isDirect = isSlackDirectMessage(message.type)

  return {
    isAddressed: isDirect || message.mentioned,
    isDirect,
  }
}

function isSlackDirectMessage(type: string) {
  return type === "message.im" || type === "message.mpim"
}

function slackRoutingMessageText(
  text: string,
  integration: Doc<"integrations">
) {
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

function githubReplyAddress(message: Doc<"messages">): ReplyAddress | null {
  const repository = readDataObject(message.data, "repository")
  const fullName = readDataString(repository, "fullName")
  const parts = fullName?.split("/")

  if (parts?.length !== 2) {
    return null
  }

  const [owner, repo] = parts
  const comment = readDataObject(message.data, "comment")
  const commentKind = readDataString(comment, "kind")

  if (commentKind === "pull_request_review") {
    const pullNumber = readDataNumber(message.data, "pullNumber")
    const commentId =
      readDataString(comment, "inReplyToId") ?? readDataString(comment, "id")

    return pullNumber === undefined || commentId === undefined
      ? null
      : { type: "github", kind: "review", owner, repo, pullNumber, commentId }
  }

  const issueNumber = readDataNumber(message.data, "issueNumber")

  return issueNumber === undefined
    ? null
    : { type: "github", kind: "issue", owner, repo, issueNumber }
}

function linearReplyAddress(message: Doc<"messages">): ReplyAddress | null {
  const issueId = readDataString(message.data, "issueId")

  return issueId === undefined ? null : { type: "linear", issueId }
}

function slackReplyAddress(message: Doc<"messages">): ReplyAddress | null {
  const channelId = getSlackChannelId(message.data)
  const messageTs = getSlackMessageTs(message.data)

  if (channelId === undefined || messageTs === undefined) {
    return null
  }

  return {
    channelId,
    type: "slack",
    threadTs: getSlackThreadTs(message.data) ?? messageTs,
  }
}
