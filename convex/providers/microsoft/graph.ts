import { fetchJson, fetchJsonObject } from "../../shared/http"
import { microsoftGraphUrl } from "./config"

export async function microsoftGraphJson(
  token: string,
  path: string,
  options: {
    method?: string
    query?: Record<string, unknown>
    body?: unknown
  } = {}
) {
  return await fetchJson(microsoftGraphRequestUrl(path, options.query ?? {}), {
    method: options.method ?? "GET",
    headers: microsoftGraphHeaders(token),
    body: options.body,
    emptyResponse: null,
  })
}

export async function microsoftGraphJsonObject(
  token: string,
  path: string,
  query: Record<string, unknown> = {}
) {
  return await fetchJsonObject(microsoftGraphRequestUrl(path, query), {
    method: "GET",
    headers: microsoftGraphHeaders(token),
  })
}

function microsoftGraphHeaders(token: string) {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  }
}

function microsoftGraphRequestUrl(
  path: string,
  query: Record<string, unknown>
) {
  const url = new URL(microsoftGraphUrl + path)

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}
