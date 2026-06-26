import {
  readRecord,
  requiredNumber,
  requiredObject,
  requiredString,
} from "../../../shared/input"
import { githubJsonObject, repositoryPath } from "./client"

const githubReactionContents = [
  "+1",
  "-1",
  "laugh",
  "confused",
  "heart",
  "hooray",
  "rocket",
  "eyes",
] as const

type GitHubReactionContent = (typeof githubReactionContents)[number]
type GitHubReactionTarget =
  | {
      issueNumber: number
      type: "issue"
    }
  | {
      commentId: number
      type: "issue_comment" | "pull_request_review_comment"
    }

export async function addGitHubReaction(
  token: string,
  args: Record<string, unknown>
) {
  const target = readReactionTarget(args.target)
  const result = await githubJsonObject(
    token,
    `${repositoryPath(args.owner, args.repo)}${reactionPath(target)}`,
    {},
    {
      method: "POST",
      body: {
        content: requiredReactionContent(args.content),
      },
    }
  )

  return {
    id: result.id,
    content: result.content,
    createdAt: result.created_at,
  }
}

function reactionPath(target: GitHubReactionTarget) {
  switch (target.type) {
    case "issue":
      return `/issues/${target.issueNumber}/reactions`
    case "issue_comment":
      return `/issues/comments/${target.commentId}/reactions`
    case "pull_request_review_comment":
      return `/pulls/comments/${target.commentId}/reactions`
  }
}

function readReactionTarget(value: unknown): GitHubReactionTarget {
  const target = readRecord(requiredObject(value, "target"))
  const type = requiredString(target.type, "target.type")

  if (type === "issue") {
    return {
      issueNumber: requiredNumber(target.issueNumber, "target.issueNumber"),
      type,
    }
  }

  if (type === "issue_comment" || type === "pull_request_review_comment") {
    return {
      commentId: requiredNumber(target.commentId, "target.commentId"),
      type,
    }
  }

  throw new Error(
    "target.type must be issue, issue_comment, or pull_request_review_comment"
  )
}

function requiredReactionContent(value: unknown): GitHubReactionContent {
  const content = requiredString(value, "content")

  if (isGitHubReactionContent(content)) {
    return content
  }

  throw new Error(
    `content must be one of: ${githubReactionContents.join(", ")}`
  )
}

function isGitHubReactionContent(
  value: string
): value is GitHubReactionContent {
  return githubReactionContents.some((content) => content === value)
}
