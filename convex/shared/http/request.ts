import {
  type JsonObject,
  type JsonValue,
  toJsonObject,
  toJsonValue,
} from "../../../contracts/json"

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
  // Provider errors can echo credentials or customer input. These exceptions
  // reach run traces, so retain the status without copying the response body.
  if (!response.ok) {
    throw new Error(`Provider API request failed (HTTP ${response.status})`)
  }

  const text = await response.text()
  try {
    const parsed: unknown =
      text === "" ? (options.emptyResponse ?? null) : JSON.parse(text)
    return toJsonValue(parsed)
  } catch {
    // JSON parser errors can contain a snippet of the original response too.
    throw new Error("Provider API returned an invalid JSON response")
  }
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
