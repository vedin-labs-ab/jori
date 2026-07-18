import { compactRecord } from "../../../../contracts/json"
import {
  readNested,
  requiredNumber,
  requiredString,
} from "../../../shared/input"
import { githubJsonObject, githubRepositoryPath } from "../api"
import { summarizeComment } from "./format"

export async function addIssueComment(
  token: string,
  args: Record<string, unknown>
) {
  const result = await githubJsonObject(
    token,
    `${repositoryPath(args.owner, args.repo)}/issues/${requiredNumber(args.issueNumber, "issueNumber")}/comments`,
    {},
    {
      method: "POST",
      body: {
        body: requiredString(args.body, "body"),
      },
    }
  )

  return summarizeComment(result)
}

function repositoryPath(owner: unknown, repo: unknown) {
  return githubRepositoryPath(
    requiredString(owner, "owner"),
    requiredString(repo, "repo")
  )
}

export async function replyToPullRequestReviewComment(
  token: string,
  args: Record<string, unknown>
) {
  const result = await githubJsonObject(
    token,
    `${repositoryPath(args.owner, args.repo)}/pulls/${requiredNumber(args.pullNumber, "pullNumber")}/comments/${requiredNumber(args.commentId, "commentId")}/replies`,
    {},
    {
      method: "POST",
      body: {
        body: requiredString(args.body, "body"),
      },
    }
  )

  return summarizeComment(result)
}

export async function addGitHubCommentReaction(
  token: string,
  args: Record<string, unknown>
) {
  const subject = requiredCommentSubject(args.subject)
  const path =
    subject === "issue_comment"
      ? `${repositoryPath(args.owner, args.repo)}/issues/comments/${requiredNumber(args.commentId, "commentId")}/reactions`
      : `${repositoryPath(args.owner, args.repo)}/pulls/comments/${requiredNumber(args.commentId, "commentId")}/reactions`
  const result = await githubJsonObject(
    token,
    path,
    {},
    {
      method: "POST",
      body: {
        content: requiredReactionContent(args.content),
      },
    }
  )

  return summarizeReaction(result)
}

function summarizeReaction(reaction: Record<string, unknown>) {
  return compactRecord({
    content: reaction.content,
    createdAt: reaction.created_at,
    id: reaction.id,
    user: readNested(reaction, "user", "login"),
  })
}

function requiredCommentSubject(value: unknown) {
  if (value === "issue_comment" || value === "pull_request_review_comment") {
    return value
  }

  throw new Error(
    "subject must be issue_comment or pull_request_review_comment"
  )
}

function requiredReactionContent(value: unknown) {
  if (
    value === "+1" ||
    value === "-1" ||
    value === "laugh" ||
    value === "confused" ||
    value === "heart" ||
    value === "hooray" ||
    value === "rocket" ||
    value === "eyes"
  ) {
    return value
  }

  throw new Error("content is not a supported GitHub reaction")
}
