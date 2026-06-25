import { type Doc } from "../_generated/dataModel"
import {
  getSlackChannelId,
  getSlackMessageTs,
  getSlackThreadTs,
} from "../providers/slack/data"
import { readDataNumber, readDataObject, readDataString } from "../shared/data"

export type ReplyTargetIdentifier = string

export type LinearReplyTarget =
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

function replyAddressForTarget(
  message: Doc<"messages">,
  target: ReplyTargetIdentifier
) {
  if (message.integration === "linear") {
    return linearReplyAddressForTarget(message, target)
  }

  return null
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
