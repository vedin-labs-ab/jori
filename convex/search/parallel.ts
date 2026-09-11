import Parallel, { APIError } from "parallel-web"
import { type Region } from "../../contracts/region"
import { requireEnvironmentVariable } from "../shared/environment"
import { normalizeExtractResponse, normalizeSearchResponse } from "./response"
import { type PageInput, type SearchClient, type SearchInput } from "./types"
import { publicUrl } from "./url"

// Endpoint selection is deployment configuration, never a tool argument.
// Regional routing alone does not verify account entitlement or residency.
export function createParallelClient(region: Region): SearchClient {
  const apiKey = requireEnvironmentVariable("PARALLEL_API_KEY")
  const searchClient = createClient(apiKey, "PARALLEL_SEARCH_BASE_URL")
  const extractClient = createClient(apiKey, "PARALLEL_EXTRACT_BASE_URL")
  return {
    region,
    processing: "global",
    search: (input) => request(() => search(searchClient, input)),
    fetch: (input) => request(() => fetchPage(extractClient, input)),
  }
}

function createClient(apiKey: string, variable: string) {
  const baseURL = process.env[variable] ?? "https://api.parallel.ai"
  let url: URL
  try {
    url = new URL(baseURL)
  } catch {
    throw new Error(`${variable} must be a Parallel HTTPS API origin`)
  }
  if (
    url.protocol !== "https:" ||
    (url.hostname !== "api.parallel.ai" &&
      !url.hostname.endsWith(".parallel.ai")) ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error(`${variable} must be a Parallel HTTPS API origin`)
  }
  return new Parallel({
    apiKey,
    baseURL: url.origin,
    maxRetries: 0,
    timeout: 30_000,
    logLevel: "off",
    fetchOptions: { redirect: "error" },
  })
}

async function search(client: Parallel, input: SearchInput) {
  const response = await client.search({
    search_queries: [input.query],
    mode: "basic",
    max_chars_total: input.maxCharacters * input.limit,
    advanced_settings: {
      max_results: input.limit,
      excerpt_settings: { max_chars_per_result: input.maxCharacters },
      source_policy: {
        include_domains: input.includeDomains,
        exclude_domains: input.excludeDomains,
      },
    },
  })
  // Parallel ignores exclusions when an allowlist is present. Apply both
  // locally as well so Jori never returns a result outside the requested policy.
  const result = normalizeSearchResponse(response)
  result.results = result.results
    .filter((entry) => {
      const host = new URL(entry.url).hostname
      return (
        (!input.includeDomains?.length ||
          matchesDomain(host, input.includeDomains)) &&
        !matchesDomain(host, input.excludeDomains ?? [])
      )
    })
    .slice(0, input.limit)
  return result
}

function matchesDomain(host: string, domains: string[]) {
  return domains.some(
    (domain) => host === domain || host.endsWith(`.${domain}`)
  )
}

async function fetchPage(client: Parallel, input: PageInput) {
  const url = publicUrl(input.url)
  if (url === null) {
    throw new Error("Page must target a public HTTP URL")
  }
  const response = await client.extract({
    urls: [url],
    objective: input.highlightQuery,
    advanced_settings: {
      full_content: {
        max_chars_per_result: input.maxLinks
          ? 100_000
          : input.maxCharacters + 1,
      },
      excerpt_settings: {
        max_chars_per_result: Math.min(1000, input.maxCharacters),
      },
      ...(input.refresh
        ? {
            fetch_policy: {
              max_age_seconds: 600,
              disable_cache_fallback: true,
              timeout_seconds: 15,
            },
          }
        : {}),
    },
  })
  const result = normalizeExtractResponse(response, input.maxLinks ?? 0)
  for (const page of result.results) {
    page.text = page.text?.slice(0, input.maxCharacters + 1)
  }
  return result
}

async function request<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    // Raw SDK errors and provider warnings can contain customer queries or keys.
    const status =
      error instanceof APIError && Number.isInteger(error.status)
        ? ` (${error.status})`
        : ""
    throw new Error(`Web provider request failed${status}`)
  }
}
