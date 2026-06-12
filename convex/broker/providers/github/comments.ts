import { requiredNumber, requiredString } from "../common"
import { githubJson, repositoryPath } from "./client"
import { summarizeComment } from "./format"

export async function addIssueComment(
  token: string,
  args: Record<string, unknown>
) {
  const result = await githubJson(
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

export async function replyToPullRequestReviewComment(
  token: string,
  args: Record<string, unknown>
) {
  const result = await githubJson(
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
