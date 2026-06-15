export async function fetchJson(
  url: string,
  options: {
    method: string
    headers: Record<string, string>
    body?: unknown
    emptyResponse?: unknown
  }
) {
  const response = await fetch(url, {
    method: options.method,
    headers: options.headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  const result =
    text === "" ? (options.emptyResponse ?? null) : JSON.parse(text)

  if (!response.ok) {
    throw new Error(`Provider API request failed: ${JSON.stringify(result)}`)
  }

  return result
}

export function jsonErrorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export function formatProviderError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function jsonError(error: string, status: number) {
  return Response.json({ error }, { status })
}

export function unauthorizedResponse() {
  return new Response("Unauthorized", { status: 401 })
}
