import { fetchJson } from "../common"

export async function googleJson(
  token: string,
  url: string,
  options: { method?: string; body?: unknown } = {}
) {
  return await fetchJson(url, {
    method: options.method ?? "GET",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: options.body,
  })
}

export async function googleMultipartJson(
  token: string,
  url: string,
  options: { method: string; body: string; contentType: string }
) {
  const response = await fetch(url, {
    method: options.method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": options.contentType,
    },
    body: options.body,
  })
  const text = await response.text()
  const result = text === "" ? null : JSON.parse(text)

  if (!response.ok) {
    throw new Error(`Provider API request failed: ${JSON.stringify(result)}`)
  }

  return result
}

export async function googleText(token: string, url: string) {
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  })
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`Provider API request failed: ${text}`)
  }

  return text
}
