import { type Doc } from "../../_generated/dataModel"
import { type ReactionTarget } from "../../reactions/data"
import {
  readDataNumber,
  readDataObject,
  readDataString,
} from "../../shared/data"
import { githubRepositoryPath } from "./api"

export type GitHubReactionSyncTarget = {
  path: string
  target: ReactionTarget
}

export function githubReactionTarget(
  message: Doc<"messages">
): GitHubReactionSyncTarget | null {
  const repository = readDataObject(message.data, "repository")
  const fullName = readDataString(repository, "fullName")

  if (fullName === undefined) {
    return null
  }

  const parts = fullName?.split("/")

  if (parts?.length !== 2) {
    return null
  }

  const [owner, repo] = parts
  const comment = readDataObject(message.data, "comment")
  const commentId = readDataString(comment, "id")

  return commentId === undefined
    ? githubIssueReactionTarget(message, owner, repo, fullName)
    : githubCommentReactionTarget(message, owner, repo, fullName, {
        commentId,
        kind: readDataString(comment, "kind"),
      })
}

export function uniqueGitHubReactionTargets(
  targets: Array<GitHubReactionSyncTarget | null>
) {
  const unique = new Map<string, GitHubReactionSyncTarget>()

  for (const target of targets) {
    if (target !== null) {
      unique.set(target.target.key, target)
    }
  }

  return [...unique.values()]
}

function githubCommentReactionTarget(
  message: Doc<"messages">,
  owner: string,
  repo: string,
  fullName: string,
  comment: {
    commentId: string
    kind?: string
  }
): GitHubReactionSyncTarget {
  const isReviewComment = comment.kind === "pull_request_review"
  const issueNumber = readDataNumber(message.data, "issueNumber")
  const pullNumber = readDataNumber(message.data, "pullNumber")

  return {
    path: `${githubRepositoryPath(owner, repo)}${
      isReviewComment ? "/pulls/comments" : "/issues/comments"
    }/${comment.commentId}/reactions`,
    target: {
      key: `github:comment:${fullName}:${comment.commentId}`,
      identifiers: [
        `github:repository:${fullName}`,
        ...issueIdentifier(fullName, issueNumber, pullNumber),
        `github:comment:${comment.commentId}`,
      ],
      conversationId: message.conversationId,
      text: message.text,
    },
  }
}

function githubIssueReactionTarget(
  message: Doc<"messages">,
  owner: string,
  repo: string,
  fullName: string
): GitHubReactionSyncTarget | null {
  const issueNumber = readDataNumber(message.data, "issueNumber")
  const pullNumber = readDataNumber(message.data, "pullNumber")
  const targetNumber = pullNumber ?? issueNumber

  if (targetNumber === undefined) {
    return null
  }

  return {
    path: `${githubRepositoryPath(owner, repo)}/issues/${targetNumber}/reactions`,
    target: {
      key: `github:${pullNumber === undefined ? "issue" : "pull"}:${fullName}#${targetNumber}`,
      identifiers: [
        `github:repository:${fullName}`,
        ...issueIdentifier(fullName, issueNumber, pullNumber),
      ],
      conversationId: message.conversationId,
      text: message.text,
    },
  }
}

function issueIdentifier(
  fullName: string,
  issueNumber: number | undefined,
  pullNumber: number | undefined
) {
  if (pullNumber !== undefined) {
    return [`github:pull:${fullName}#${pullNumber}`]
  }

  return issueNumber === undefined
    ? []
    : [`github:issue:${fullName}#${issueNumber}`]
}
