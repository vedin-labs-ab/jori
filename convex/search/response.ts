import {
  type ContentsOptions,
  type SearchResponse as ExaResponse,
} from "exa-js"
import { type SearchResponse, type SearchResult } from "./types"

export function normalizeExaResponse(
  response: ExaResponse<ContentsOptions>
): SearchResponse {
  return {
    provider: {
      name: "exa",
      requestId: response.requestId,
      resolvedSearchType: response.resolvedSearchType,
      searchTimeMs: response.searchTime,
      statuses: response.statuses,
    },
    results: response.results.map(normalizeResult),
  }
}

function normalizeResult(
  result: ExaResponse<ContentsOptions>["results"][number]
): SearchResult {
  const contents = result as typeof result & {
    text?: string
    highlights?: string[]
    extras?: { links?: string[] }
  }

  return {
    url: result.url,
    id: result.id,
    title: result.title ?? undefined,
    author: result.author,
    faviconUrl: result.favicon,
    imageUrl: result.image,
    publishedAt: result.publishedDate,
    score: result.score,
    text: typeof contents.text === "string" ? contents.text : undefined,
    highlights: strings(contents.highlights),
    links: strings(contents.extras?.links),
  }
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}
