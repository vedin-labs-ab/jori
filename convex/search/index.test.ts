import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { callWebTool } from "../broker/tools/web"
import { crawlPage } from "../organization/crawl"
import { createSearchClient } from "./index"

const providerFetch = vi.fn()
beforeEach(() => {
  vi.stubGlobal("fetch", providerFetch)
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("PARALLEL_API_KEY", "test-key")
  vi.stubEnv("PARALLEL_SEARCH_BASE_URL", "https://api.parallel.ai")
  vi.stubEnv("PARALLEL_EXTRACT_BASE_URL", "https://api.parallel.ai")
  mockProvider()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
function mockProvider(extra = {}) {
  providerFetch.mockReset().mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          search_id: "search-test",
          extract_id: "extract-test",
          session_id: "session-test",
          results: [
            {
              url: "https://example.com/",
              title: "Example",
              excerpts: ["Public page"],
              full_content: "A public page. [About](/about)",
            },
          ],
          errors: [],
          ...extra,
        }),
        { headers: { "Content-Type": "application/json" } }
      )
  )
}
function requestBody() {
  return JSON.parse(providerFetch.mock.calls[0][1].body)
}

test.each(["eu", "us"])(
  "%s uses only its deployment credential and explicitly reports global processing",
  async (region) => {
    vi.stubEnv("JORI_REGION", region)
    vi.stubEnv("PARALLEL_API_KEY", `test-${region}-key`)
    const client = createSearchClient()
    const result = await client.search({
      query: "public documentation",
      limit: 2,
      maxCharacters: 500,
    })
    expect(client.region).toBe(region)
    expect(client.processing).toBe("global")
    expect(providerFetch.mock.calls[0][0].toString()).toBe(
      "https://api.parallel.ai/v1/search"
    )
    expect(
      new Headers(providerFetch.mock.calls[0][1].headers).get("x-api-key")
    ).toBe(`test-${region}-key`)
    expect(result.provider.name).toBe("parallel")
  }
)
test.each([undefined, "", "invalid"])(
  "rejects invalid deployment region %s before any network request",
  (region) => {
    vi.stubEnv("JORI_REGION", region)
    expect(() => createSearchClient()).toThrow("JORI_REGION")
    expect(providerFetch).not.toHaveBeenCalled()
  }
)
test("does not borrow another deployment's credential", () => {
  vi.stubEnv("PARALLEL_API_KEY", undefined)
  expect(() => createSearchClient()).toThrow("Missing PARALLEL_API_KEY")
  expect(providerFetch).not.toHaveBeenCalled()
})
test("web fetch returns full content rather than treating excerpts as the page", async () => {
  const result = await callWebTool("web_fetch", { url: "https://example.com/" })
  expect(result).toMatchObject({
    provider: { name: "parallel", operation: "contents" },
    results: [{ content: { text: "A public page. [About](/about)" } }],
  })
  expect(requestBody().advanced_settings.full_content).toEqual({
    max_chars_per_result: 8001,
  })
})
test("crawl uses bounded fresh content and discovers relative links", async () => {
  const page = await crawlPage("https://example.com/")
  expect(page?.links).toEqual(["https://example.com/about"])
  expect(requestBody().advanced_settings.fetch_policy).toEqual({
    max_age_seconds: 600,
    disable_cache_fallback: true,
    timeout_seconds: 15,
  })
})
test("exclusions still apply when Parallel ignores them with an allowlist", async () => {
  mockProvider({
    results: [
      { url: "https://blocked.example.com/a", excerpts: ["blocked"] },
      { url: "https://other.com/a", excerpts: ["outside"] },
      { url: "https://example.com/a", excerpts: ["allowed"] },
    ],
  })
  const result = await callWebTool("web_search", {
    query: "example",
    includeDomains: ["example.com"],
    excludeDomains: ["blocked.example.com"],
  })
  expect(result).toMatchObject({ results: [{ url: "https://example.com/a" }] })
  expect((result as { results: unknown[] }).results).toHaveLength(1)
})
test("operation endpoints are independent and requests never follow redirects", async () => {
  vi.stubEnv("PARALLEL_SEARCH_BASE_URL", "https://eu.parallel.ai")
  vi.stubEnv("PARALLEL_EXTRACT_BASE_URL", "https://api.parallel.ai")
  const client = createSearchClient()
  await client.search({ query: "public", limit: 1, maxCharacters: 500 })
  await client.fetch({ url: "https://example.com/", maxCharacters: 1000 })
  expect(providerFetch.mock.calls.map((x) => x[0].toString())).toEqual([
    "https://eu.parallel.ai/v1/search",
    "https://api.parallel.ai/v1/extract",
  ])
  for (const [, options] of providerFetch.mock.calls) {
    expect(options.redirect).toBe("error")
    expect(options.signal).toBeInstanceOf(AbortSignal)
  }
})
test.each([
  "http://api.parallel.ai",
  "https://parallel.ai.evil.test",
  "https://api.parallel.ai/path",
  "https://user:password@api.parallel.ai",
])("rejects unsafe configured endpoint %s", (endpoint) => {
  vi.stubEnv("PARALLEL_SEARCH_BASE_URL", endpoint)
  expect(() => createSearchClient()).toThrow("Parallel HTTPS API origin")
  expect(providerFetch).not.toHaveBeenCalled()
})
test("provider failures are not retried, rerouted, or leaked into tool logs", async () => {
  vi.stubEnv("PARALLEL_SEARCH_BASE_URL", "https://eu.parallel.ai")
  providerFetch.mockImplementation(
    async () =>
      new Response(JSON.stringify({ error: "secret-key private-query" }), {
        status: 503,
      })
  )
  await expect(
    callWebTool("web_search", { query: "private-query" })
  ).rejects.toThrow("web_search failed: Web provider request failed (503)")
  expect(providerFetch).toHaveBeenCalledTimes(1)
  expect(providerFetch.mock.calls[0][0].toString()).toBe(
    "https://eu.parallel.ai/v1/search"
  )
})
test("background crawls also reject private URLs before contacting the provider", async () => {
  await expect(crawlPage("http://127.0.0.1/admin")).rejects.toThrow(
    "Web provider request failed"
  )
  expect(providerFetch).not.toHaveBeenCalled()
})

test("timeout aborts the provider request without a retry or fallback", async () => {
  vi.useFakeTimers()
  try {
    let signal: AbortSignal | undefined
    providerFetch.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          signal = options.signal
          signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError"))
          )
        })
    )
    const pending = callWebTool("web_search", { query: "public" })
    const rejected = expect(pending).rejects.toThrow(
      "Web provider request failed"
    )
    await vi.advanceTimersByTimeAsync(30_001)
    await rejected
    expect(signal?.aborted).toBe(true)
    expect(providerFetch).toHaveBeenCalledTimes(1)
  } finally {
    vi.useRealTimers()
  }
})
