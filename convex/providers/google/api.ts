import { fetchJsonObject } from "../../shared/http"

export async function googleJson(
  token: string,
  url: string,
  options: { method?: string; body?: unknown } = {}
) {
  return await fetchJsonObject(url, {
    method: options.method ?? "GET",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: options.body,
  })
}
