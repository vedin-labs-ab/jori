import { githubApiUrl } from "../../providers/github/config"
import { requireGitHubCredentials } from "../../providers/github/credentials"
import { fetchJson } from "../../shared/http"
import {
  compactDescription,
  maxOptions,
  normalizeQuery,
  type OptionLoaderArgs,
  optionalOptionString,
  optionMatches,
  readArray,
  readNestedString,
  readRecord,
  requireCriterion,
  requiredOptionNumber,
  requiredOptionString,
} from "./common"

export async function searchGitHubRepositories(args: OptionLoaderArgs) {
  const token = requireGitHubToken(args.integration)
  const normalizedQuery = normalizeQuery(args.query)
  const result = await githubJson(token, "/installation/repositories", {
    per_page: 100,
  })

  return readArray(result.repositories)
    .map(readRecord)
    .map((repository) => ({
      value: requiredOptionString(repository.full_name),
      label: requiredOptionString(repository.full_name),
      description: githubRepositoryDescription(repository),
    }))
    .filter((option) => optionMatches(option, normalizedQuery))
    .slice(0, maxOptions)
}

export async function searchGitHubIssues(args: OptionLoaderArgs) {
  return await searchGitHubIssueLike(args, "issue")
}

export async function searchGitHubPullRequests(args: OptionLoaderArgs) {
  return await searchGitHubIssueLike(args, "pr")
}

async function searchGitHubIssueLike(
  args: OptionLoaderArgs,
  kind: "issue" | "pr"
) {
  const token = requireGitHubToken(args.integration)
  const repo = requireCriterion(args.criteria, "repo", "repository")
  const result = await githubJson(token, "/search/issues", {
    q: [normalizeQuery(args.query), `repo:${repo}`, `is:${kind}`]
      .filter(Boolean)
      .join(" "),
    per_page: maxOptions,
  })

  return readArray(result.items).map((item) => {
    const issue = readRecord(item)
    const number = requiredOptionNumber(issue.number)

    return {
      value: String(number),
      label: `#${number} ${requiredOptionString(issue.title)}`,
      description: compactDescription([
        requiredOptionString(issue.state),
        readNestedString(issue, "user", "login"),
      ]),
    }
  })
}

function requireGitHubToken(integration: OptionLoaderArgs["integration"]) {
  const credentials = requireGitHubCredentials(integration)

  if (credentials.tokens?.access === undefined) {
    throw new Error("Missing GitHub runtime token")
  }

  return credentials.tokens.access
}

async function githubJson(
  token: string,
  path: string,
  query: Record<string, unknown> = {}
) {
  const url = new URL(githubApiUrl + path)

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  return await fetchJson(url.toString(), {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
  })
}

function githubRepositoryDescription(repository: Record<string, unknown>) {
  return compactDescription([
    repository.private === true ? "Private" : "Public",
    optionalOptionString(repository.description),
  ])
}
