import {
  compactGitHubSummary,
  summarizeComment,
  summarizePullRequest,
} from "../../../integrations/github/delivery/format"
import {
  boundedNumber,
  optionalString,
  readArray,
  readRecord,
  requiredNumber,
} from "../../../shared/input"
import { githubJson, githubJsonObject, repositoryPath } from "./client"
import { normalizeBranchName } from "./source"

export async function listPullRequestFiles(
  token: string,
  args: Record<string, unknown>
) {
  const result = await githubJson(
    token,
    `${repositoryPath(args.owner, args.repo)}/pulls/${requiredNumber(args.pullNumber, "pullNumber")}/files`,
    {
      page: boundedNumber(args.page, 1, 1, 100),
      per_page: boundedNumber(args.perPage, 30, 1, 100),
    }
  )

  return {
    files: readArray(result).map(readRecord).map(summarizePullRequestFile),
  }
}

export async function listPullRequestReviewComments(
  token: string,
  args: Record<string, unknown>
) {
  const result = await githubJson(
    token,
    `${repositoryPath(args.owner, args.repo)}/pulls/${requiredNumber(args.pullNumber, "pullNumber")}/comments`,
    {
      page: boundedNumber(args.page, 1, 1, 100),
      per_page: boundedNumber(args.perPage, 30, 1, 100),
    }
  )

  return {
    comments: readArray(result)
      .map(readRecord)
      .map(summarizePullRequestReviewComment),
  }
}

export async function updatePullRequest(
  token: string,
  args: Record<string, unknown>
) {
  const body = pullRequestUpdateBody(args)

  if (Object.keys(body).length === 0) {
    throw new Error("At least one pull request field is required")
  }

  return summarizePullRequest(
    await githubJsonObject(
      token,
      `${repositoryPath(args.owner, args.repo)}/pulls/${requiredNumber(args.pullNumber, "pullNumber")}`,
      {},
      {
        method: "PATCH",
        body,
      }
    )
  )
}

function pullRequestUpdateBody(args: Record<string, unknown>) {
  return {
    ...(optionalString(args.base) === undefined
      ? {}
      : { base: normalizeBranchName(args.base, "base") }),
    ...(typeof args.body === "string" ? { body: args.body } : {}),
    ...(optionalBoolean(args.maintainerCanModify) === undefined
      ? {}
      : { maintainer_can_modify: optionalBoolean(args.maintainerCanModify) }),
    ...(readPullRequestState(args.state) === undefined
      ? {}
      : { state: readPullRequestState(args.state) }),
    ...(optionalString(args.title) === undefined
      ? {}
      : { title: optionalString(args.title) }),
  }
}

function summarizePullRequestFile(file: Record<string, unknown>) {
  return compactGitHubSummary({
    additions: file.additions,
    blobUrl: file.blob_url,
    changes: file.changes,
    deletions: file.deletions,
    filename: file.filename,
    previousFilename: file.previous_filename,
    rawUrl: file.raw_url,
    sha: file.sha,
    status: file.status,
  })
}

function summarizePullRequestReviewComment(comment: Record<string, unknown>) {
  return compactGitHubSummary({
    ...summarizeComment(comment),
    commitId: comment.commit_id,
    diffHunk: comment.diff_hunk,
    inReplyToId: comment.in_reply_to_id,
    line: comment.line,
    originalLine: comment.original_line,
    path: comment.path,
    pullRequestReviewId: comment.pull_request_review_id,
    side: comment.side,
  })
}

function readPullRequestState(value: unknown) {
  if (value === "open" || value === "closed") {
    return value
  }

  return undefined
}

function optionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined
}
