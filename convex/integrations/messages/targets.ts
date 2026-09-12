import { type Doc, type Id } from "../../_generated/dataModel"
import {
  readDataNumber,
  readDataObject,
  readDataString,
} from "../../shared/data"
import {
  getSlackChannelId,
  getSlackMessageTs,
  getSlackThreadTs,
} from "../slack/data"

export type ReplyTargetIdentifier = string

type LinearReplyTarget =
  | {
      id: string
      issueId: string
      type: "comment"
    }
  | {
      id: string
      type: "issue"
    }

export type ReplyAddress =
  | {
      type: "console"
      conversationId: Id<"conversations">
    }
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
      target: LinearReplyTarget
    }
  | {
      channelId: string
      threadTs: string
      type: "slack"
    }

export function replyAddress(
  message: Doc<"messages">,
  target?: ReplyTargetIdentifier
): ReplyAddress | null {
  if (target !== undefined) {
    return replyAddressForTarget(message, target)
  }

  switch (message.surface) {
    case "console":
      return consoleReplyAddress(message)
    case "github":
      return githubReplyAddress(message)
    case "linear":
      return linearReplyAddress(message)
    case "slack":
      return slackReplyAddress(message)
  }
}

function replyAddressForTarget(
  message: Doc<"messages">,
  target: ReplyTargetIdentifier
) {
  if (message.surface === "linear") {
    return linearReplyAddressForTarget(message, target)
  }

  return null
}

// A console message's conversation key is the conversation's own id, so the
// reply lands back in the same thread without a provider address.
function consoleReplyAddress(message: Doc<"messages">): ReplyAddress {
  return {
    type: "console",
    conversationId: message.conversationId as Id<"conversations">,
  }
}

function linearReplyAddressForTarget(
  message: Doc<"messages">,
  target: ReplyTargetIdentifier
): ReplyAddress | null {
  const issueId = targetValue(target, "linear:issue")

  if (issueId !== null) {
    return { type: "linear", target: { id: issueId, type: "issue" } }
  }

  const commentId = targetValue(target, "linear:thread")
  const commentIssueId = readDataString(message.data, "issueId")

  return commentId === null || commentIssueId === undefined
    ? null
    : {
        type: "linear",
        target: { id: commentId, issueId: commentIssueId, type: "comment" },
      }
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
    return comment === undefined
      ? null
      : githubReviewReplyAddress(message, owner, repo, comment)
  }

  const issueNumber = readDataNumber(message.data, "issueNumber")

  return issueNumber === undefined
    ? null
    : { type: "github", kind: "issue", owner, repo, issueNumber }
}

function githubReviewReplyAddress(
  message: Doc<"messages">,
  owner: string,
  repo: string,
  comment: Record<string, unknown>
): ReplyAddress | null {
  const pullNumber = readDataNumber(message.data, "pullNumber")
  const commentId =
    readDataString(comment, "inReplyToId") ?? readDataString(comment, "id")

  return pullNumber === undefined || commentId === undefined
    ? null
    : { type: "github", kind: "review", owner, repo, pullNumber, commentId }
}

function linearReplyAddress(message: Doc<"messages">): ReplyAddress | null {
  const parentCommentId = readDataString(message.data, "parentCommentId")
  const issueId = readDataString(message.data, "issueId")

  if (issueId === undefined) {
    return null
  }

  return parentCommentId === undefined
    ? { type: "linear", target: { id: issueId, type: "issue" } }
    : {
        type: "linear",
        target: { id: parentCommentId, issueId, type: "comment" },
      }
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

function targetValue(target: ReplyTargetIdentifier, prefix: string) {
  const fullPrefix = `${prefix}:`

  return target.startsWith(fullPrefix) ? target.slice(fullPrefix.length) : null
}
