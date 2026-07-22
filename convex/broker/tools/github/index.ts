import { type JsonObject } from "../../../../contracts/json"
import { type Doc } from "../../../_generated/dataModel"
import {
  addGitHubCommentReaction,
  addIssueComment,
  replyToPullRequestReviewComment,
} from "../../../integrations/github/delivery/comments"
import {
  summarizeComment,
  summarizeIssue,
  summarizePullRequest,
  summarizeRepository,
} from "../../../integrations/github/delivery/format"
import { base64Decode } from "../../../shared/encoding"
import {
  boundedNumber,
  optionalString,
  readArray,
  readNested,
  readRecord,
  requiredNumber,
  requiredString,
} from "../../../shared/input"
import {
  encodeGitHubPath,
  githubJson,
  githubJsonObject,
  repositoryPath,
  requireGitHubRuntimeToken,
} from "./client"
import { commitToPullRequest, createPullRequest } from "./publish"
import {
  listPullRequestFiles,
  listPullRequestReviewComments,
  updatePullRequest,
} from "./pulls"

export function createGitHubCloneCredentials(args: {
  integration: Doc<"integrations">
  owner: string
  repo: string
}) {
  const token = requireGitHubRuntimeToken(args.integration)

  return {
    remoteUrl: `https://github.com/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}.git`,
    token,
    username: "x-access-token",
  }
}

export async function callGitHubTool(
  integration: Doc<"integrations">,
  tool: string,
  args: Record<string, unknown>
) {
  const handler = githubToolHandlers[tool]

  if (handler === undefined) {
    throw new Error(`Unknown GitHub tool: ${tool}`)
  }

  return await handler(requireGitHubRuntimeToken(integration), args)
}

const githubToolHandlers: Record<
  string,
  (token: string, args: Record<string, unknown>) => Promise<unknown> | unknown
> = {
  github_add_comment_reaction: addGitHubCommentReaction,
  github_add_issue_comment: addIssueComment,
  github_clone_repository: cloneRepository,
  github_commit_to_pull_request: commitToPullRequest,
  github_create_pull_request: createPullRequest,
  github_get_file: getFile,
  github_get_issue: getIssue,
  github_get_pull_request: getPullRequest,
  github_get_repository: getRepository,
  github_list_pull_request_files: listPullRequestFiles,
  github_list_pull_request_review_comments: listPullRequestReviewComments,
  github_list_repositories: listRepositories,
  github_reply_to_pull_request_review_comment: replyToPullRequestReviewComment,
  github_search_issues: searchIssues,
  github_update_pull_request: updatePullRequest,
}

function cloneRepository(_token: string, args: Record<string, unknown>) {
  const directory = optionalString(args.directory)
  const ref = optionalString(args.ref)
  const clone = {
    kind: "github_repository",
    owner: requiredString(args.owner, "owner"),
    repo: requiredString(args.repo, "repo"),
    ...(directory === undefined ? {} : { directory }),
    ...(ref === undefined ? {} : { ref }),
  } satisfies JsonObject

  return {
    clone,
  }
}

async function listRepositories(token: string, args: Record<string, unknown>) {
  const result = await githubJsonObject(token, "/installation/repositories", {
    per_page: boundedNumber(args.perPage, 30, 1, 100),
    page: boundedNumber(args.page, 1, 1, 100),
  })

  return {
    totalCount: result.total_count,
    repositories: readArray(result.repositories)
      .map(readRecord)
      .map(summarizeRepository),
  }
}

async function getRepository(token: string, args: Record<string, unknown>) {
  return summarizeRepository(
    await githubJsonObject(token, repositoryPath(args.owner, args.repo))
  )
}

async function searchIssues(token: string, args: Record<string, unknown>) {
  const query = requiredString(args.query, "query")
  const owner = optionalString(args.owner)
  const repo = optionalString(args.repo)
  const scopedQuery =
    owner !== undefined && repo !== undefined
      ? `${query} repo:${owner}/${repo}`
      : query
  const state =
    args.state === "open" || args.state === "closed"
      ? ` state:${args.state}`
      : ""
  const result = await githubJsonObject(token, "/search/issues", {
    q: scopedQuery + state,
    per_page: boundedNumber(args.perPage, 30, 1, 100),
    page: boundedNumber(args.page, 1, 1, 100),
  })

  return {
    totalCount: result.total_count,
    items: readArray(result.items)
      .map(readRecord)
      .map((item) => ({
        title: item.title,
        number: item.number,
        state: item.state,
        repositoryUrl: item.repository_url,
        htmlUrl: item.html_url,
        pullRequest: item.pull_request !== undefined,
        updatedAt: item.updated_at,
        user: readNested(item, "user", "login"),
      })),
  }
}

async function getIssue(token: string, args: Record<string, unknown>) {
  const issueNumber = requiredNumber(args.issueNumber, "issueNumber")
  const commentsLimit = boundedNumber(args.comments, 30, 0, 100)
  const issuePath = `${repositoryPath(args.owner, args.repo)}/issues/${issueNumber}`
  const issue = await githubJsonObject(token, issuePath)
  const comments =
    commentsLimit === 0
      ? []
      : await githubJson(token, `${issuePath}/comments`, {
          per_page: commentsLimit,
        })

  return {
    issue: summarizeIssue(issue),
    comments: readArray(comments).map(readRecord).map(summarizeComment),
  }
}

async function getPullRequest(token: string, args: Record<string, unknown>) {
  const pullNumber = requiredNumber(args.pullNumber, "pullNumber")
  return summarizePullRequest(
    await githubJsonObject(
      token,
      `${repositoryPath(args.owner, args.repo)}/pulls/${pullNumber}`
    )
  )
}

async function getFile(token: string, args: Record<string, unknown>) {
  const path = requiredString(args.path, "path")
  const ref = optionalString(args.ref)
  const result = await githubJson(
    token,
    `${repositoryPath(args.owner, args.repo)}/contents/${encodeGitHubPath(path)}`,
    ref === undefined ? {} : { ref }
  )

  if (Array.isArray(result)) {
    return {
      type: "directory",
      entries: result.map((entry) => {
        const file = readRecord(entry)

        return {
          name: file.name,
          path: file.path,
          type: file.type,
          size: file.size,
          htmlUrl: file.html_url,
        }
      }),
    }
  }

  const file = readRecord(result)

  if (file.type !== "file") {
    return file
  }

  const content =
    file.encoding === "base64" && typeof file.content === "string"
      ? base64Decode(file.content)
      : ""

  return {
    name: file.name,
    path: file.path,
    sha: file.sha,
    size: file.size,
    htmlUrl: file.html_url,
    truncated: content.length > 100_000,
    content: content.slice(0, 100_000),
  }
}
