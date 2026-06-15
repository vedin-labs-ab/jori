import { type Doc } from "../../../_generated/dataModel"
import { githubApiUrl } from "../../../providers/github/config"
import { base64Decode } from "../../../shared/encoding"
import { jsonErrorResponse } from "../../../shared/http"
import {
  boundedNumber,
  optionalString,
  readNested,
  requiredNumber,
  requiredString,
} from "../../../shared/input"
import {
  githubHeaders,
  githubJson,
  repositoryPath,
  requireGitHubRuntimeToken,
} from "./client"
import { addIssueComment, replyToPullRequestReviewComment } from "./comments"
import {
  summarizeComment,
  summarizeIssue,
  summarizePullRequest,
  summarizeRepository,
} from "./format"

export async function fetchGitHubTarball(args: {
  integration: Doc<"integrations">
  owner: string
  repo: string
  ref?: string
}) {
  const token = requireGitHubRuntimeToken(args.integration)
  const suffix =
    args.ref === undefined || args.ref === ""
      ? ""
      : `/${encodeURIComponent(args.ref)}`
  const response = await fetch(
    `${githubApiUrl}/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/tarball${suffix}`,
    {
      headers: githubHeaders(token),
      redirect: "follow",
    }
  )

  if (!response.ok) {
    return jsonErrorResponse("GitHub archive download failed", response.status)
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      "content-type": "application/gzip",
    },
  })
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
  github_add_issue_comment: addIssueComment,
  github_clone_repository: cloneRepository,
  github_get_file: getFile,
  github_get_issue: getIssue,
  github_get_pull_request: getPullRequest,
  github_get_repository: getRepository,
  github_list_repositories: listRepositories,
  github_reply_to_pull_request_review_comment: replyToPullRequestReviewComment,
  github_search_issues: searchIssues,
}

function cloneRepository(_token: string, args: Record<string, unknown>) {
  return {
    download: {
      kind: "github_tarball",
      owner: requiredString(args.owner, "owner"),
      repo: requiredString(args.repo, "repo"),
      directory: optionalString(args.directory),
      ref: optionalString(args.ref),
    },
  }
}

async function listRepositories(token: string, args: Record<string, unknown>) {
  const result = await githubJson(token, "/installation/repositories", {
    per_page: boundedNumber(args.perPage, 30, 1, 100),
    page: boundedNumber(args.page, 1, 1, 100),
  })

  return {
    totalCount: result.total_count,
    repositories: (result.repositories ?? []).map(summarizeRepository),
  }
}

async function getRepository(token: string, args: Record<string, unknown>) {
  return summarizeRepository(
    await githubJson(token, repositoryPath(args.owner, args.repo))
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
  const result = await githubJson(token, "/search/issues", {
    q: scopedQuery + state,
    per_page: boundedNumber(args.perPage, 30, 1, 100),
    page: boundedNumber(args.page, 1, 1, 100),
  })

  return {
    totalCount: result.total_count,
    items: (result.items ?? []).map((item: Record<string, unknown>) => ({
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
  const issue = await githubJson(token, issuePath)
  const comments =
    commentsLimit === 0
      ? []
      : await githubJson(token, `${issuePath}/comments`, {
          per_page: commentsLimit,
        })

  return {
    issue: summarizeIssue(issue),
    comments: comments.map(summarizeComment),
  }
}

async function getPullRequest(token: string, args: Record<string, unknown>) {
  const pullNumber = requiredNumber(args.pullNumber, "pullNumber")
  return summarizePullRequest(
    await githubJson(
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
    `${repositoryPath(args.owner, args.repo)}/contents/${encodeRepositoryPath(path)}`,
    ref === undefined ? {} : { ref }
  )

  if (Array.isArray(result)) {
    return {
      type: "directory",
      entries: result.map((entry) => ({
        name: entry.name,
        path: entry.path,
        type: entry.type,
        size: entry.size,
        htmlUrl: entry.html_url,
      })),
    }
  }

  if (result.type !== "file") {
    return result
  }

  const content =
    result.encoding === "base64" && typeof result.content === "string"
      ? base64Decode(result.content)
      : ""

  return {
    name: result.name,
    path: result.path,
    sha: result.sha,
    size: result.size,
    htmlUrl: result.html_url,
    truncated: content.length > 100_000,
    content: content.slice(0, 100_000),
  }
}

function encodeRepositoryPath(value: string) {
  return value.split("/").map(encodeURIComponent).join("/")
}
