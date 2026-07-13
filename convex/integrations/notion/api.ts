import { toJsonObject } from "../../../contracts/json"
import { fetchJsonObject } from "../../shared/http"
import { notionApiUrl, notionApiVersion } from "./config"

export async function notionJson(
  token: string,
  method: string,
  path: string,
  body?: unknown,
  queryParams: Record<string, unknown> = {}
) {
  return await fetchJsonObject(notionUrl(path, queryParams), {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "notion-version": notionApiVersion,
    },
    body,
  })
}

export async function notionMultipartJson(
  token: string,
  path: string,
  body: FormData
) {
  const response = await fetch(notionUrl(path), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "notion-version": notionApiVersion,
    },
    body,
  })
  const text = await response.text()
  const parsed: unknown = text === "" ? null : JSON.parse(text)
  const result = toJsonObject(parsed)

  if (!response.ok) {
    throw new Error(`Provider API request failed: ${JSON.stringify(result)}`)
  }

  return result
}

function notionUrl(path: string, queryParams: Record<string, unknown> = {}) {
  const url = new URL(notionApiUrl + path)

  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}
