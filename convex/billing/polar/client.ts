import { readNumber, readRecord } from "../../shared/input"
import { requirePolarAccessToken, requirePolarBaseUrl } from "./config"

/** Pin the API and webhook contracts together. Polar rotates quarterly;
 * nine months of support includes its initial three-month preview. */
const apiVersion = "2026-10"

type PolarQuery = Record<string, string | number | string[]>

/**
 * The whole Polar surface Jori uses is a handful of REST calls, so the edge
 * is a plain fetch client rather than an SDK. Responses come back as loosely
 * typed objects; call sites read the few fields they need.
 */
export async function polarRequest(
  path: string,
  args?: {
    method?: "GET" | "POST" | "PATCH" | "DELETE"
    query?: PolarQuery
    body?: Record<string, unknown>
  }
): Promise<Record<string, unknown>> {
  const method = args?.method ?? "GET"
  const sendsBody = method === "POST" || method === "PATCH"
  const url = new URL(path, requirePolarBaseUrl())
  for (const [key, value] of Object.entries(args?.query ?? {})) {
    for (const item of [value].flat()) {
      url.searchParams.append(key, String(item))
    }
  }
  const response = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${requirePolarAccessToken()}`,
      accept: "application/json",
      "polar-version": apiVersion,
      ...(sendsBody ? { "content-type": "application/json" } : {}),
    },
    ...(sendsBody ? { body: JSON.stringify(args?.body ?? {}) } : {}),
  })
  if (!response.ok) {
    // Provider messages can reflect submitted credentials or customer values.
    throw new Error(`Polar request failed (HTTP ${response.status})`)
  }
  try {
    return (await response.json()) as Record<string, unknown>
  } catch {
    // JSON parser errors may include a snippet of the response body.
    throw new Error("Polar returned invalid JSON")
  }
}

/** Jori only ever needs to know a short list is complete, so a list that
 *  spills past one page throws instead of being walked. */
export async function polarList(path: string, query: PolarQuery) {
  const result = await polarRequest(path, { query: { ...query, limit: 100 } })
  const pages = readNumber(result.pagination, "max_page")

  if (!Array.isArray(result.items) || pages === undefined || pages > 1) {
    throw new Error("Polar returned more than Jori can verify automatically.")
  }

  return result.items.map(readRecord)
}

/** For fields a successful Polar response must carry, like session URLs. */
export function requireString(payload: Record<string, unknown>, key: string) {
  const value = payload[key]

  if (typeof value !== "string") {
    throw new Error(`Polar response is missing "${key}".`)
  }

  return value
}
