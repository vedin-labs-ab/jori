import { afterEach, describe, expect, test, vi } from "vitest"
import { schemaViolations } from "../../../../test/convex/schema"
import { googleToolInputSchemas } from "../../../runs/agent/tools/schemas/google"
import { googleToolResponseSchemas } from "../../../runs/agent/tools/schemas/responses/google"
import { validateSchemaValue } from "../../input/validation"
import { searchGmailThreads } from "./read"

afterEach(() => vi.unstubAllGlobals())

describe.each([
  ["google_gmail_get_threads", "threadIds"],
  ["google_gmail_get_messages", "messageIds"],
] as const)("%s batch validation", (tool, field) => {
  const schema = googleToolInputSchemas[tool]

  test.each([[], [""], [" "], ["valid", 123], Array(51).fill("id")])(
    "rejects invalid IDs at the schema boundary: %j",
    (...ids) => {
      const args = { [field]: ids }
      expect(schemaViolations(args, schema)).not.toEqual([])
      expect(() => validateSchemaValue(args, schema, "input")).toThrow()
    }
  )

  test.each([1, 50])("accepts %i nonempty IDs", (count) => {
    const args = {
      [field]: Array.from({ length: count }, (_, index) => `id-${index}`),
    }
    expect(schemaViolations(args, schema)).toEqual([])
    expect(() => validateSchemaValue(args, schema, "input")).not.toThrow()
  })
})

describe("Gmail search pagination", () => {
  test("accepts and forwards the returned token while preserving the query", async () => {
    const pageToken = "opaque+/=token"
    const args = { maxResults: 1, pageToken, q: "subject:JORI-E2E" }
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        threads: [{ id: "thread-2", snippet: "Synthetic message" }],
        nextPageToken: "next-token",
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    expect(
      schemaViolations(args, googleToolInputSchemas.google_gmail_search_threads)
    ).toEqual([])
    const result = await searchGmailThreads("test-token", args)
    const url = new URL(fetchMock.mock.calls[0]?.[0])
    expect(url.searchParams.get("pageToken")).toBe(pageToken)
    expect(url.searchParams.get("q")).toBe(args.q)
    expect(url.searchParams.get("maxResults")).toBe("1")
    expect(result).toEqual({
      threads: [{ threadId: "thread-2", snippet: "Synthetic message" }],
      nextPageToken: "next-token",
    })
    expect(
      schemaViolations(
        result,
        googleToolResponseSchemas.google_gmail_search_threads
      )
    ).toEqual([])
  })

  test("omits the token on an initial request and an exhausted response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({}))
    vi.stubGlobal("fetch", fetchMock)

    expect(await searchGmailThreads("test-token", {})).toEqual({ threads: [] })
    const url = new URL(fetchMock.mock.calls[0]?.[0])
    expect(url.searchParams.has("pageToken")).toBe(false)
    expect(url.searchParams.get("maxResults")).toBe("10")
  })

  test("rejects a non-string pagination token in the tool schema", () => {
    expect(
      schemaViolations(
        { pageToken: 123 },
        googleToolInputSchemas.google_gmail_search_threads
      )
    ).not.toEqual([])
  })
})
