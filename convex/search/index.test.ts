import { afterEach, expect, test, vi } from "vitest"
import { callWebTool } from "../broker/tools/web"
import { crawlPage } from "../organization/crawl"
import { createSearchClient } from "./index"

const providerFetch = vi.hoisted(() => {
  const fetch = vi.fn()
  vi.stubGlobal("fetch", fetch)
  return fetch
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function mockProvider() {
  providerFetch.mockReset().mockResolvedValue(
    new Response(
      JSON.stringify({
        requestId: "request-test",
        results: [
          {
            id: "page-test",
            url: "https://example.com",
            title: "Example",
            text: "A public page.",
            highlights: ["Public page"],
            extras: { links: ["https://example.com/about"] },
          },
        ],
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  )
  return providerFetch
}

test.each([
  "eu",
  "us",
])("%s selects its deployment credential and declares global processing", async (region) => {
  vi.stubEnv("JORI_REGION", region)
  vi.stubEnv("EXA_API_KEY", `test-${region}-key`)
  const fetch = mockProvider()
  const client = createSearchClient()
  const result = await client.search({
    query: "public documentation",
    limit: 2,
    maxCharacters: 500,
  })

  expect(client.region).toBe(region)
  expect(client.processing).toBe("global")
  expect(fetch).toHaveBeenCalledWith(
    "https://api.exa.ai/search",
    expect.objectContaining({
      headers: expect.objectContaining({ "x-api-key": `test-${region}-key` }),
    })
  )
  expect(result.provider.name).toBe("exa")
  expect(result.results[0].links).toEqual(["https://example.com/about"])
})

test.each([
  undefined,
  "",
  "invalid",
])("rejects missing or invalid region %s before contacting Exa", (region) => {
  vi.stubEnv("JORI_REGION", region)
  vi.stubEnv("EXA_API_KEY", "test-key")
  const fetch = mockProvider()
  expect(() => createSearchClient()).toThrow("JORI_REGION")
  expect(fetch).not.toHaveBeenCalled()
})

test("does not borrow another deployment's credential", () => {
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("EXA_API_KEY", undefined)
  const fetch = mockProvider()
  expect(() => createSearchClient()).toThrow("Missing EXA_API_KEY")
  expect(fetch).not.toHaveBeenCalled()
})

test("web tools return normalized provider-neutral results", async () => {
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("EXA_API_KEY", "test-key")
  mockProvider()
  const result = await callWebTool("web_fetch", { url: "https://example.com" })
  expect(result).toMatchObject({
    provider: { name: "exa", operation: "contents" },
    results: [
      { url: "https://example.com", content: { text: "A public page." } },
    ],
  })
})

test("organization crawl uses the same regional boundary and fresh content", async () => {
  vi.stubEnv("JORI_REGION", "us")
  vi.stubEnv("EXA_API_KEY", "test-key")
  const fetch = mockProvider()
  const page = await crawlPage("https://example.com")
  expect(page).toMatchObject({
    text: "A public page.",
    links: ["https://example.com/about"],
  })
  expect(fetch).toHaveBeenCalledWith(
    "https://api.exa.ai/contents",
    expect.objectContaining({
      body: expect.stringContaining('"livecrawl":"always"'),
    })
  )
})

test("provider errors cannot leak request data into tool logs", async () => {
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("EXA_API_KEY", "secret-key")
  providerFetch.mockRejectedValue(new Error("secret-key private-query"))
  await expect(
    callWebTool("web_search", { query: "private-query" })
  ).rejects.toThrow("web_search failed: Web provider request failed")
})
