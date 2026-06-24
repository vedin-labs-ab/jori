import { type Doc } from "../_generated/dataModel"
import {
  getSlackBotUserId,
  getSlackChannelId,
  getSlackMessageTs,
  getSlackThreadTs,
} from "../providers/slack/data"
import { type ActorKind, getActorExternalId } from "../shared/actor"
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

export type ReactionAddress =
  | {
      commentId?: string
      issueId?: string
      type: "linear"
    }
  | {
      channelId: string
      messageTs: string
      type: "slack"
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

export function messageActorIds(message: Doc<"messages">) {
  if (message.integration === "linear") {
    return linearActorIds(message)
  }

  if (message.integration === "slack") {
    return slackActorIds(message)
  }

  return []
}

export function messageIds(message: Doc<"messages">) {
  if (message.integration === "linear") {
    return linearMessageIds(message)
  }

  if (message.integration === "slack") {
    return slackMessageIds(message)
  }

  return []
}

function linearActorIds(message: Doc<"messages">) {
  const externalId = getActorExternalId(message.actor)

  if (externalId === undefined || externalId === "") {
    return []
  }

  return [`${linearActorIdPrefix(message.actor?.kind)}:${externalId}`]
}

function linearMessageIds(message: Doc<"messages">) {
  const commentId = readDataString(message.data, "commentId")

  return commentId === undefined ? [] : [`linear:comment:${commentId}`]
}

function slackActorIds(message: Doc<"messages">) {
  const externalId = getActorExternalId(message.actor)

  if (externalId === undefined || externalId === "") {
    return []
  }

  return [`${slackActorIdPrefix(message.actor?.kind)}:${externalId}`]
}

function slackMessageIds(message: Doc<"messages">) {
  const ts = getSlackMessageTs(message.data)

  return ts === undefined ? [] : [`slack:message:${ts}`]
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

export function reactionAddress(
  message: Doc<"messages">
): ReactionAddress | null {
  if (message.integration === "linear") {
    return linearReactionAddress(message)
  }

  if (message.integration === "slack") {
    return slackReactionAddress(message)
  }

  return null
}

export function supportsSurfaceReaction(integration: string) {
  return integration === "linear" || integration === "slack"
}

function slackActorIdPrefix(kind: ActorKind | undefined) {
  return kind === "bot" ? "slack:bot" : "slack:user"
}

function linearActorIdPrefix(kind: ActorKind | undefined) {
  return kind === "bot" ? "linear:bot" : "linear:user"
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

function linearReactionAddress(
  message: Doc<"messages">
): ReactionAddress | null {
  const commentId = readDataString(message.data, "commentId")
  const issueId = readDataString(message.data, "issueId")

  if (commentId !== undefined) {
    return issueId === undefined
      ? { type: "linear", commentId }
      : { type: "linear", commentId, issueId }
  }

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

function slackReactionAddress(
  message: Doc<"messages">
): ReactionAddress | null {
  const channelId = getSlackChannelId(message.data)
  const messageTs = getSlackMessageTs(message.data)

  return channelId === undefined || messageTs === undefined
    ? null
    : { channelId, messageTs, type: "slack" }
}
