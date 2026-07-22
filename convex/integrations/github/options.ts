import { optionalString } from "../../shared/input"
import {
  compactDescription,
  maxOptions,
  normalizeQuery,
  type OptionLoaderArgs,
  optionMatches,
  readArray,
  readNestedString,
  readRecord,
  requiredOptionNumber,
  requiredOptionString,
  requireMatch,
} from "../options/common"
import { githubJsonObject } from "./api"
import { requireGitHubRuntimeToken } from "./credentials"

export async function searchGitHubRepositories(args: OptionLoaderArgs) {
  const token = requireGitHubRuntimeToken(args.integration)
  const normalizedQuery = normalizeQuery(args.query)
  const result = await githubJsonObject(token, "/installation/repositories", {
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
  const token = requireGitHubRuntimeToken(args.integration)
  const repo = requireMatch(args.match, "repo", "repository")
  const result = await githubJsonObject(token, "/search/issues", {
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

function githubRepositoryDescription(repository: Record<string, unknown>) {
  return compactDescription([
    repository.private === true ? "Private" : "Public",
    optionalString(repository.description),
  ])
}
