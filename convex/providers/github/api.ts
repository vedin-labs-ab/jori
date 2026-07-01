import { fetchJson, fetchJsonObject } from "../../shared/http"
import { githubApiUrl } from "./config"

export async function githubJson(
  token: string,
  path: string,
  query: Record<string, unknown> = {},
  options: { method?: string; body?: unknown } = {}
) {
  return await fetchJson(githubUrl(path, query), {
    method: options.method ?? "GET",
    headers: githubHeaders(token),
    body: options.body,
  })
}

export async function githubJsonObject(
  token: string,
  path: string,
  query: Record<string, unknown> = {},
  options: { method?: string; body?: unknown } = {}
) {
  return await fetchJsonObject(githubUrl(path, query), {
    method: options.method ?? "GET",
    headers: githubHeaders(token),
    body: options.body,
  })
}

export async function githubJsonArray(
  token: string,
  path: string,
  query: Record<string, unknown> = {}
) {
  const result = await fetchJson(githubUrl(path, query), {
    method: "GET",
    headers: githubHeaders(token),
  })

  if (!Array.isArray(result)) {
    throw new Error("GitHub API response was not an array")
  }

  return result
}

export function githubHeaders(token: string) {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  }
}

export function githubRepositoryPath(owner: string, repo: string) {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
}

function githubUrl(path: string, query: Record<string, unknown>) {
  const url = new URL(githubApiUrl + path)

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}
