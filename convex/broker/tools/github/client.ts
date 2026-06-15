import { type Doc } from "../../../_generated/dataModel"
import { githubApiUrl } from "../../../providers/github/config"
import { requireGitHubCredentials } from "../../../providers/github/credentials"
import { fetchJson } from "../../../shared/http"
import { requiredString } from "../../../shared/input"

export function requireGitHubRuntimeToken(integration: Doc<"integrations">) {
  const credentials = requireGitHubCredentials(integration)

  if (credentials.tokens?.access === undefined) {
    throw new Error("Missing GitHub runtime token")
  }

  return credentials.tokens.access
}

export async function githubJson(
  token: string,
  path: string,
  query: Record<string, unknown> = {},
  options: { method?: string; body?: unknown } = {}
) {
  const url = new URL(githubApiUrl + path)

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  return await fetchJson(url.toString(), {
    method: options.method ?? "GET",
    headers: githubHeaders(token),
    body: options.body,
  })
}

export function githubHeaders(token: string) {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  }
}

export function repositoryPath(ownerValue: unknown, repoValue: unknown) {
  return `/repos/${encodeURIComponent(requiredString(ownerValue, "owner"))}/${encodeURIComponent(requiredString(repoValue, "repo"))}`
}
