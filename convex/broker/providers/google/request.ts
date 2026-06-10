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
