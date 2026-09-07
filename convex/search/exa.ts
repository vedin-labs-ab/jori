import Exa, { type ContentsOptions, ExaError } from "exa-js"
import { type Region } from "../../contracts/region"
import { requireEnvironmentVariable } from "../shared/environment"
import { normalizeExaResponse } from "./response"
import { withTimeout } from "./timeout"
import { type PageInput, type SearchClient, type SearchInput } from "./types"

// Exa documents one global API. Separate deployment keys isolate credentials,
// not provider processing or retention. Do not infer residency from JORI_REGION.
const connections = {
  eu: { endpoint: "https://api.exa.ai", processing: "global" },
  us: { endpoint: "https://api.exa.ai", processing: "global" },
} as const

export function createExaClient(region: Region): SearchClient {
  const connection = connections[region]
  const client = new Exa(
    requireEnvironmentVariable("EXA_API_KEY"),
    connection.endpoint
  )

  return {
    region,
    processing: connection.processing,
    search: (input) => search(client, input),
    fetch: (input) => fetchPage(client, input),
  }
}

async function search(client: Exa, input: SearchInput) {
  return await request(
    () =>
      client.search(input.query, {
        contents: {
          highlights: {
            query: input.query,
            maxCharacters: Math.min(1000, input.maxCharacters),
          },
          text: { maxCharacters: input.maxCharacters },
        },
        excludeDomains: input.excludeDomains,
        includeDomains: input.includeDomains,
        moderation: true,
        numResults: input.limit,
        type: "auto",
      }),
    12_000
  )
}

async function fetchPage(client: Exa, input: PageInput) {
  const options: ContentsOptions = {
    filterEmptyResults: false,
    highlights:
      input.highlightQuery === undefined
        ? true
        : {
            query: input.highlightQuery,
            maxCharacters: Math.min(1000, input.maxCharacters),
          },
    livecrawl: input.refresh ? "always" : "fallback",
    livecrawlTimeout: input.refresh ? 8000 : 5000,
    text: { maxCharacters: input.maxCharacters },
    ...(input.maxLinks === undefined
      ? {}
      : { extras: { links: input.maxLinks } }),
  }

  return await request(() => client.getContents(input.url, options), 15_000)
}

async function request(
  operation: () => Promise<Parameters<typeof normalizeExaResponse>[0]>,
  timeoutMs: number
) {
  try {
    return normalizeExaResponse(
      await withTimeout(operation(), timeoutMs, "Web provider request")
    )
  } catch (error) {
    // Provider messages can echo queries, URLs or credentials. Keep them out of
    // persisted tool errors and logs, including errors from network middleware.
    const status = error instanceof ExaError ? ` (${error.statusCode})` : ""
    throw new Error(`Web provider request failed${status}`)
  }
}
