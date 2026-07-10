import {
  type JsonObject,
  type JsonValue,
  toJsonObject,
  toJsonValue,
} from "../../contracts/json"

export async function fetchJson(
  url: string,
  options: {
    method: string
    headers: Record<string, string>
    body?: unknown
    emptyResponse?: unknown
  }
): Promise<JsonValue> {
  const response = await fetch(url, {
    method: options.method,
    headers: options.headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  const parsed: unknown =
    text === "" ? (options.emptyResponse ?? null) : JSON.parse(text)
  const result = toJsonValue(parsed)

  if (!response.ok) {
    throw new Error(`Provider API request failed: ${JSON.stringify(result)}`)
  }

  return result
}

export async function fetchJsonObject(
  url: string,
  options: Parameters<typeof fetchJson>[1]
): Promise<JsonObject> {
  return toJsonObject(await fetchJson(url, options))
}

export function formatProviderError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function jsonError(error: string, status: number) {
  return Response.json({ error }, { status })
}

export function unauthorizedResponse(headers?: HeadersInit) {
  return new Response("Unauthorized", { status: 401, headers })
}
