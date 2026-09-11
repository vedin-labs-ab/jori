import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { encodeToolResult } from "../../../contracts/json"
import { callWebTool } from "./web"

const parallelMock = vi.hoisted(() => ({
  constructor: vi.fn(),
  extract: vi.fn(),
  search: vi.fn(),
}))

vi.mock("parallel-web", () => {
  function MockParallel(options: { apiKey: string }) {
    parallelMock.constructor(options.apiKey)

    return {
      extract: parallelMock.extract,
      search: parallelMock.search,
    }
  }

  class MockParallelError extends Error {
    status: number

    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }

  return {
    default: MockParallel,
    APIError: MockParallelError,
  }
})

beforeEach(() => {
  vi.stubEnv("PARALLEL_API_KEY", "parallel-key")
  vi.stubEnv("JORI_REGION", "eu")
  parallelMock.constructor.mockClear()
  parallelMock.extract.mockReset()
  parallelMock.search.mockReset()
})

afterEach(() => vi.unstubAllEnvs())

test("searches Parallel and returns normalized web results", async () => {
  mockSearchResponse()

  const result = await callSearch()

  expect(parallelMock.constructor).toHaveBeenCalledWith("parallel-key")
  expectSearchRequest()
  expectSearchResult(result)
})

test("fetches Parallel contents with a sanitized public URL", async () => {
  mockFetchResponse()

  const result = await callFetch()

  expectFetchRequest()
  expectFetchResult(result)
})

test("normalizes sparse Parallel contents into JSON-safe results", async () => {
  parallelMock.extract.mockResolvedValue({
    results: [
      {
        id: undefined,
        url: "https://example.com/page",
        title: undefined,
        excerpts: [undefined, "Relevant"],
        full_content: undefined,
      },
      {
        id: "missing-url",
        title: "Skipped",
      },
    ],
  })

  const result = await callFetch()

  expect(result).toMatchObject({
    provider: {
      name: "parallel",
      operation: "contents",
    },
    results: [
      {
        url: "https://example.com/page",
        title: null,
        source: {
          id: "https://example.com/page",
          provider: "parallel",
        },
        highlights: ["Relevant"],
        content: {
          text: null,
        },
      },
    ],
  })
  expect(() => encodeToolResult(result)).not.toThrow()
})

test("blocks private-network and credentialed URLs before Parallel sees them", async () => {
  await expect(
    callWebTool("web_fetch", { url: "http://127.0.0.1:8080/a" })
  ).rejects.toThrow("web_fetch failed: url must target a public host")

  await expect(
    callWebTool("web_fetch", { url: "http://localhost./a" })
  ).rejects.toThrow("web_fetch failed: url must target a public host")

  await expect(
    callWebTool("web_fetch", { url: "https://user:pass@example.com/a" })
  ).rejects.toThrow("web_fetch failed: url must not include credentials")

  await expect(
    callWebTool("web_search", {
      query: "current example",
      includeDomains: ["example.com:443"],
    })
  ).rejects.toThrow(
    "web_search failed: includeDomains must contain domains only"
  )

  expect(parallelMock.extract).not.toHaveBeenCalled()
  expect(parallelMock.search).not.toHaveBeenCalled()
})

function mockSearchResponse() {
  parallelMock.search.mockResolvedValue({
    search_id: "req-search",
    results: [
      {
        url: "https://example.com/a",
        title: "Example",
        publish_date: "2026-06-01",
        excerpts: ["Relevant highlight", "x".repeat(1100)],
      },
    ],
  })
}

function mockFetchResponse() {
  parallelMock.extract.mockResolvedValue({
    extract_id: "req-fetch",
    results: [
      {
        url: "https://example.com/page?x=1",
        title: "Fetched page",
        excerpts: [],
        full_content: "Fetched body",
      },
    ],
  })
}

function callSearch() {
  return callWebTool("web_search", {
    query: "current example",
    limit: 1,
    includeDomains: ["Example.com"],
    excludeDomains: ["Blocked.example"],
    maxCharacters: 1000,
  })
}

function callFetch() {
  return callWebTool("web_fetch", {
    url: "https://example.com/page?x=1#fragment",
    highlightQuery: "body",
    maxCharacters: 2000,
  })
}

function expectSearchRequest() {
  expect(parallelMock.search).toHaveBeenCalledWith(
    expect.objectContaining({
      search_queries: ["current example"],
      advanced_settings: expect.objectContaining({
        source_policy: {
          exclude_domains: ["blocked.example"],
          include_domains: ["example.com"],
        },
        max_results: 1,
      }),
    })
  )
}

function expectFetchRequest() {
  expect(parallelMock.extract).toHaveBeenCalledWith(
    expect.objectContaining({
      urls: ["https://example.com/page?x=1"],
      objective: "body",
      advanced_settings: expect.objectContaining({
        full_content: { max_chars_per_result: 2001 },
      }),
    })
  )
}

function expectSearchResult(result: unknown) {
  expect(result).toMatchObject({
    provider: {
      name: "parallel",
      operation: "search",
      requestId: "req-search",
    },
    results: [
      {
        url: "https://example.com/a",
        title: "Example",
        source: {
          provider: "parallel",
          id: "https://example.com/a",
          publishedAt: "2026-06-01",
        },
        snippet: "Relevant highlight",
        content: {
          characters: 1120,
          truncated: true,
        },
      },
    ],
    truncated: true,
  })
}

function expectFetchResult(result: unknown) {
  expect(result).toMatchObject({
    provider: {
      name: "parallel",
      operation: "contents",
      requestId: "req-fetch",
    },
    results: [
      {
        url: "https://example.com/page?x=1",
        content: {
          text: "Fetched body",
          truncated: false,
        },
      },
    ],
    truncated: false,
  })
}
