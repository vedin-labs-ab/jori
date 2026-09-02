import { type ContentsOptions, type SearchResponse } from "exa-js"

type ExaResponse = SearchResponse<ContentsOptions>
type ExaResult = ExaResponse["results"][number]

type WebOperation = "contents" | "search"

type WebToolResult = {
  provider: {
    name: "exa"
    operation: WebOperation
    requestId?: string
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

type WebResult = {
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
    results: response.results
      .map((result) => normalizeWebResult(result, args.maxCharacters))
      .filter((result): result is WebResult => result !== null),
    truncated: response.results.length >= args.requestedResults,
  }
}

function normalizeProviderTrace(
  response: ExaResponse,
  operation: WebOperation
): WebToolResult["provider"] {
  const requestId = readString(response.requestId)
  const resolvedSearchType = readString(response.resolvedSearchType)
  const searchTimeMs = readNumber(response.searchTime)
  const statuses = normalizeStatuses(response.statuses)

  return {
    name: "exa",
    operation,
    ...(requestId === null ? {} : { requestId }),
    ...(resolvedSearchType === null ? {} : { resolvedSearchType }),
    ...(searchTimeMs === null ? {} : { searchTimeMs }),
    ...(statuses.length === 0 ? {} : { statuses }),
  }
}

function normalizeWebResult(
  result: ExaResult,
  maxCharacters: number
): WebResult | null {
  const contentFields = result as ExaResult & Record<string, unknown>
  const content = truncateText(readString(contentFields.text), maxCharacters)
  const highlights = readHighlights(contentFields.highlights, maxCharacters)
  const url = readString(result.url)

  if (url === null) {
    return null
  }

  const id = readString(result.id) ?? url
  const author = readString(result.author)
  const faviconUrl = readString(result.favicon)
  const imageUrl = readString(result.image)
  const publishedAt = readString(result.publishedDate)
  const score = readNumber(result.score)

  return {
    url,
    title: readString(result.title),
    source: {
      provider: "exa",
      id,
      ...(author === null ? {} : { author }),
      ...(faviconUrl === null ? {} : { faviconUrl }),
      ...(imageUrl === null ? {} : { imageUrl }),
      ...(publishedAt === null ? {} : { publishedAt }),
      ...(score === null ? {} : { score }),
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

function normalizeStatuses(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry) => {
    const status = readStatus(entry)

    return status === null ? [] : [status]
  })
}

function readStatus(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }

  const entry = value as Record<string, unknown>
  const id = readString(entry.id)
  const source = readString(entry.source)
  const status = readString(entry.status)

  return id === null || source === null || status === null
    ? null
    : { id, source, status }
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

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
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
