import {
  type ContentsOptions,
  ExaError,
  type RegularSearchOptions,
  type SearchResponse,
} from "exa-js"
import { createExaClient, withTimeout } from "../../../shared/exa"
import { normalizeWebFetchInput, normalizeWebSearchInput } from "./input"
import { normalizeWebResponse } from "./output"

const searchTimeoutMs = 12_000
const fetchTimeoutMs = 15_000

export async function callWebTool(tool: string, args: Record<string, unknown>) {
  if (tool === "web_search") {
    return await runWebTool(tool, () => searchWeb(args))
  }

  if (tool === "web_fetch") {
    return await runWebTool(tool, () => fetchWeb(args))
  }

  throw new Error(`Unknown web tool: ${tool}`)
}

async function searchWeb(args: Record<string, unknown>) {
  const input = normalizeWebSearchInput(args)
  const options = {
    contents: {
      highlights: {
        query: input.query,
        maxCharacters: Math.min(1000, input.maxCharacters),
      },
      text: {
        maxCharacters: input.maxCharacters,
      },
    },
    excludeDomains: input.excludeDomains,
    includeDomains: input.includeDomains,
    moderation: true,
    numResults: input.limit,
    type: "auto",
  } satisfies RegularSearchOptions

  const response = await withTimeout(
    createExaClient().search(input.query, options),
    searchTimeoutMs,
    "web_search"
  )

  return normalizeWebResponse(response, {
    maxCharacters: input.maxCharacters,
    operation: "search",
    requestedResults: input.limit,
  })
}

async function fetchWeb(args: Record<string, unknown>) {
  const input = normalizeWebFetchInput(args)
  const options = {
    filterEmptyResults: false,
    highlights:
      input.highlightQuery === undefined
        ? true
        : {
            query: input.highlightQuery,
            maxCharacters: Math.min(1000, input.maxCharacters),
          },
    livecrawl: "fallback",
    livecrawlTimeout: 5000,
    text: {
      maxCharacters: input.maxCharacters,
    },
  } satisfies ContentsOptions

  const response = await withTimeout(
    createExaClient().getContents(input.url, options),
    fetchTimeoutMs,
    "web_fetch"
  )

  return normalizeWebResponse(response as SearchResponse<ContentsOptions>, {
    maxCharacters: input.maxCharacters,
    operation: "contents",
    requestedResults: Number.POSITIVE_INFINITY,
  })
}

async function runWebTool(
  tool: string,
  operation: () => Promise<unknown>
): Promise<unknown> {
  try {
    return await operation()
  } catch (error) {
    throw new Error(formatWebToolError(tool, error))
  }
}

function formatWebToolError(tool: string, error: unknown) {
  if (error instanceof ExaError) {
    return `${tool} failed: Exa request failed with status ${error.statusCode}: ${error.message}`
  }

  return error instanceof Error
    ? `${tool} failed: ${error.message}`
    : `${tool} failed`
}
