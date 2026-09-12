import { marked } from "marked"
import {
  type ExtractResponse,
  type SearchResult as ParallelResponse,
} from "parallel-web/resources/top-level"
import { type SearchResponse, type SearchResult } from "./types"
import { publicUrl } from "./url"

export function normalizeSearchResponse(
  response: ParallelResponse
): SearchResponse {
  return {
    provider: { name: "parallel", requestId: response.search_id },
    results: response.results.flatMap((result) =>
      normalizeResult(result, false, 0)
    ),
  }
}

export function normalizeExtractResponse(
  response: ExtractResponse,
  maxLinks: number
): SearchResponse {
  return {
    provider: {
      name: "parallel",
      requestId: response.extract_id,
      statuses: (response.errors ?? []).flatMap((error) => {
        const url = publicUrl(error.url)
        return url === null
          ? []
          : [
              {
                id: url,
                source: "parallel",
                status: Number.isInteger(error.http_status_code)
                  ? `http_${error.http_status_code}`
                  : "failed",
              },
            ]
      }),
    },
    results: response.results.flatMap((result) =>
      normalizeResult(result, true, maxLinks)
    ),
  }
}

function normalizeResult(
  result: ParallelResponse["results"][number] & {
    full_content?: string | null
  },
  fullContent: boolean,
  maxLinks: number
): SearchResult[] {
  const url = typeof result.url === "string" ? publicUrl(result.url) : null
  if (url === null) {
    return []
  }
  const highlights = strings(result.excerpts)
  const text = fullContent
    ? typeof result.full_content === "string"
      ? result.full_content
      : undefined
    : highlights.join("\n\n")
  return [
    {
      url,
      title: result.title ?? undefined,
      publishedAt: result.publish_date ?? undefined,
      text,
      highlights,
      links:
        text === undefined || maxLinks <= 0 ? [] : links(text, url, maxLinks),
    },
  ]
}

function links(markdown: string, base: string, limit: number) {
  const found = new Set<string>()
  void marked.walkTokens(marked.lexer(markdown), (token) => {
    if (token.type !== "link" || found.size >= limit) {
      return
    }
    const url = publicUrl(token.href, base)
    if (url !== null && url !== base) {
      found.add(url)
    }
  })
  return [...found]
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}
