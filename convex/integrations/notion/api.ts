import { toJsonObject } from "../../../contracts/json"
import { notionApiUrl, notionApiVersion } from "./config"

export async function notionJson(
  token: string,
  method: string,
  path: string,
  body?: unknown,
  queryParams: Record<string, unknown> = {}
) {
  const response = await fetch(notionUrl(path, queryParams), {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "notion-version": notionApiVersion,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return await readNotionResponse(response)
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
  return await readNotionResponse(response)
}

export class NotionApiError extends Error {
  constructor(readonly status: number) {
    super(`Notion API request failed (${status})`)
  }
}

async function readNotionResponse(response: Response) {
  if (!response.ok) {
    throw new NotionApiError(response.status)
  }
  const text = await response.text()
  try {
    return toJsonObject(text === "" ? null : JSON.parse(text))
  } catch {
    throw new Error("Notion API returned an invalid response")
  }
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
