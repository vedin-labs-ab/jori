import { type ContentsOptions, type SearchResponse } from "exa-js"

type ExaResponse = SearchResponse<ContentsOptions>
type ExaResult = ExaResponse["results"][number]

export type WebOperation = "contents" | "search"

export type WebToolResult = {
  provider: {
    name: "exa"
    operation: WebOperation
    requestId: string
    resolvedSearchType?: string
    searchTimeMs?: number
    statuses?: Array<{
      id: string
      source: string
      status: string
    }>
  }
  results: WebResult[]
  truncated: boolean
}

export type WebResult = {
  url: string
  title: string | null
  source: {
    provider: "exa"
    id: string
    author?: string
    faviconUrl?: string
    imageUrl?: string
    publishedAt?: string
    score?: number
  }
  snippet: string | null
  highlights: string[]
  content: {
    text: string | null
    characters: number
    truncated: boolean
  }
}

export function normalizeWebResponse(
  response: ExaResponse,
  args: {
    maxCharacters: number
    operation: WebOperation
    requestedResults: number
  }
): WebToolResult {
  return {
    provider: normalizeProviderTrace(response, args.operation),
    results: response.results.map((result) =>
      normalizeWebResult(result, args.maxCharacters)
    ),
    truncated: response.results.length >= args.requestedResults,
  }
}

function normalizeProviderTrace(
  response: ExaResponse,
  operation: WebOperation
): WebToolResult["provider"] {
  return {
    name: "exa",
    operation,
    requestId: response.requestId,
    ...(response.resolvedSearchType === undefined
      ? {}
      : { resolvedSearchType: response.resolvedSearchType }),
    ...(response.searchTime === undefined
      ? {}
      : { searchTimeMs: response.searchTime }),
    ...(response.statuses === undefined
      ? {}
      : {
          statuses: response.statuses.map((status) => ({
            id: status.id,
            source: status.source,
            status: status.status,
          })),
        }),
  }
}

function normalizeWebResult(
  result: ExaResult,
  maxCharacters: number
): WebResult {
  const contentFields = result as ExaResult & Record<string, unknown>
  const content = truncateText(readString(contentFields.text), maxCharacters)
  const highlights = readHighlights(contentFields.highlights, maxCharacters)

  return {
    url: result.url,
    title: result.title,
    source: {
      provider: "exa",
      id: result.id,
      ...(result.author === undefined ? {} : { author: result.author }),
      ...(result.favicon === undefined ? {} : { faviconUrl: result.favicon }),
      ...(result.image === undefined ? {} : { imageUrl: result.image }),
      ...(result.publishedDate === undefined
        ? {}
        : { publishedAt: result.publishedDate }),
      ...(result.score === undefined ? {} : { score: result.score }),
    },
    snippet: firstSnippet(highlights, content.text),
    highlights,
    content: {
      text: content.text,
      characters: content.characters,
      truncated: content.truncated,
    },
  }
}

function readHighlights(value: unknown, maxCharacters: number) {
  if (!Array.isArray(value)) {
    return []
  }

  const maxHighlightCharacters = Math.min(1000, maxCharacters)

  return value
    .filter((highlight): highlight is string => typeof highlight === "string")
    .map((highlight) => truncateText(highlight, maxHighlightCharacters).text)
    .filter((highlight): highlight is string => highlight !== null)
}

function firstSnippet(highlights: string[], text: string | null) {
  const source = highlights[0] ?? text

  if (source === null || source.trim() === "") {
    return null
  }

  return source.length > 500 ? `${source.slice(0, 497).trimEnd()}...` : source
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null
}

function truncateText(value: string | null, maxCharacters: number) {
  if (value === null) {
    return {
      text: null,
      characters: 0,
      truncated: false,
    }
  }

  const truncated = value.length > maxCharacters

  return {
    text: truncated ? `${value.slice(0, maxCharacters).trimEnd()}...` : value,
    characters: value.length,
    truncated,
  }
}
