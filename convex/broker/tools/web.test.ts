import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { encodeToolResult } from "../../../contracts/json"
import { callWebTool } from "./web"

const exaMock = vi.hoisted(() => ({
  constructor: vi.fn(),
  getContents: vi.fn(),
  search: vi.fn(),
}))

vi.mock("exa-js", () => {
  function MockExa(apiKey: string) {
    exaMock.constructor(apiKey)

    return {
      getContents: exaMock.getContents,
      search: exaMock.search,
    }
  }

  class MockExaError extends Error {
    statusCode: number

    constructor(message: string, statusCode: number) {
      super(message)
      this.statusCode = statusCode
    }
  }

  return {
    default: MockExa,
    ExaError: MockExaError,
  }
})

beforeEach(() => {
  vi.stubEnv("EXA_API_KEY", "exa-key")
  vi.stubEnv("JORI_REGION", "eu")
  exaMock.constructor.mockClear()
  exaMock.getContents.mockReset()
  exaMock.search.mockReset()
})

afterEach(() => vi.unstubAllEnvs())

test("searches Exa and returns normalized web results", async () => {
  mockSearchResponse()

  const result = await callSearch()

  expect(exaMock.constructor).toHaveBeenCalledWith("exa-key")
  expectSearchRequest()
  expectSearchResult(result)
})

test("fetches Exa contents with a sanitized public URL", async () => {
  mockFetchResponse()

  const result = await callFetch()

  expectFetchRequest()
  expectFetchResult(result)
})

test("normalizes sparse Exa contents into JSON-safe results", async () => {
  exaMock.getContents.mockResolvedValue({
    results: [
      {
        id: undefined,
        url: "https://example.com/page",
        title: undefined,
        highlights: [undefined, "Relevant"],
        text: undefined,
      },
      {
        id: "missing-url",
        title: "Skipped",
      },
    ],
    statuses: [{ id: undefined, source: "exa", status: "success" }],
  })

  const result = await callFetch()

  expect(result).toMatchObject({
    provider: {
      name: "exa",
      operation: "contents",
    },
    results: [
      {
        url: "https://example.com/page",
        title: null,
        source: {
          id: "https://example.com/page",
          provider: "exa",
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

test("blocks private-network and credentialed URLs before Exa sees them", async () => {
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

  expect(exaMock.getContents).not.toHaveBeenCalled()
  expect(exaMock.search).not.toHaveBeenCalled()
})

function mockSearchResponse() {
  exaMock.search.mockResolvedValue({
    requestId: "req-search",
    resolvedSearchType: "neural",
    searchTime: 42,
    statuses: [{ id: "crawl-a", source: "exa", status: "success" }],
    results: [
      {
        id: "doc-a",
        url: "https://example.com/a",
        title: "Example",
        author: "Ada",
        favicon: "https://example.com/favicon.ico",
        image: "https://example.com/image.png",
        publishedDate: "2026-06-01",
        score: 0.9,
        highlights: ["Relevant highlight"],
        text: "x".repeat(1100),
      },
    ],
  })
}

function mockFetchResponse() {
  exaMock.getContents.mockResolvedValue({
    requestId: "req-fetch",
    results: [
      {
        id: "doc-b",
        url: "https://example.com/page?x=1",
        title: "Fetched page",
        highlights: [],
        text: "Fetched body",
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
  expect(exaMock.search).toHaveBeenCalledWith(
    "current example",
    expect.objectContaining({
      excludeDomains: ["blocked.example"],
      includeDomains: ["example.com"],
      moderation: true,
      numResults: 1,
    })
  )
}

function expectFetchRequest() {
  expect(exaMock.getContents).toHaveBeenCalledWith(
    "https://example.com/page?x=1",
    expect.objectContaining({
      highlights: { query: "body", maxCharacters: 1000 },
      livecrawl: "fallback",
      text: { maxCharacters: 2000 },
    })
  )
}

function expectSearchResult(result: unknown) {
  expect(result).toMatchObject({
    provider: {
      name: "exa",
      operation: "search",
      requestId: "req-search",
      resolvedSearchType: "neural",
      searchTimeMs: 42,
    },
    results: [
      {
        url: "https://example.com/a",
        title: "Example",
        source: {
          provider: "exa",
          id: "doc-a",
          author: "Ada",
          publishedAt: "2026-06-01",
          score: 0.9,
        },
        snippet: "Relevant highlight",
        highlights: ["Relevant highlight"],
        content: {
          characters: 1100,
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
      name: "exa",
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
