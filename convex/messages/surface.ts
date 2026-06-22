import { type Doc } from "../_generated/dataModel"
import {
  getSlackBotUserId,
  getSlackChannelId,
  getSlackMessageTs,
  getSlackThreadTs,
} from "../providers/slack/data"
import { getActorExternalId } from "../shared/actor"
import { readDataNumber, readDataObject, readDataString } from "../shared/data"

export type MessageAudience = {
  isAddressed: boolean
  isDirect: boolean
  isMentioned: boolean
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

export type MessageActorIdentifier = {
  key: string
  value: string
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

export function messageActorIdentifiers(
  message: Doc<"messages">
): MessageActorIdentifier[] {
  const externalId = getActorExternalId(message.actor)

  if (externalId === undefined || externalId === "") {
    return []
  }

  return [{ key: surfaceIdentifierKey(message.integration), value: externalId }]
}

export function messageActorIdentifierLabels(message: Doc<"messages">) {
  return messageActorIdentifiers(message).map((identifier) => {
    return `${identifier.key}=${identifier.value}`
  })
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

function surfaceIdentifierKey(integration: Doc<"messages">["integration"]) {
  if (integration === "github") {
    return "github_id"
  }

  if (integration === "linear") {
    return "linear_id"
  }

  if (integration === "slack") {
    return "slack_id"
  }

  return `${integration}_id`
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
