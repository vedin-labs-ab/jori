import Exa, {
  type ContentsOptions,
  ExaError,
  type RegularSearchOptions,
  type SearchResponse,
} from "exa-js"
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

function createExaClient() {
  return new Exa(requireExaApiKey())
}

function requireExaApiKey() {
  const apiKey = process.env.EXA_API_KEY?.trim()

  if (apiKey === undefined || apiKey === "") {
    throw new Error("Missing EXA_API_KEY")
  }

  return apiKey
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
) {
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout)
    }
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
