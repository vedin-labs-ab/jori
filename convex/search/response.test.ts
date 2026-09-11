import { expect, test } from "vitest"
import { normalizeExtractResponse } from "./response"

function response(results: unknown[], errors: unknown[] = []) {
  return JSON.parse(
    JSON.stringify({ extract_id: "extract-test", results, errors })
  )
}
test("normalizes sparse content without substituting excerpts for a missing page", () => {
  const result = normalizeExtractResponse(
    response([
      {
        url: "https://example.com/",
        full_content: null,
        excerpts: [null, "Relevant"],
      },
      { url: "http://localhost/private" },
      { title: "Missing URL" },
    ]),
    50
  )
  expect(result.results).toHaveLength(1)
  expect(result.results[0]).toMatchObject({
    text: undefined,
    highlights: ["Relevant"],
    links: [],
  })
})
test("discovers Markdown links, resolves references, deduplicates and excludes unsafe targets and images", () => {
  const result = normalizeExtractResponse(
    response([
      {
        url: "https://example.com/",
        excerpts: [],
        full_content:
          "[About](/about#team) [Again](https://example.com/about) [Team][t] ![Image](/photo.png) [Local](http://localhost/a) [Auth](https://u:p@example.com) [JS](javascript:alert)\n\n[t]: /team\n\n<https://example.com/contact>",
      },
    ]),
    50
  )
  expect(result.results[0].links).toEqual([
    "https://example.com/about",
    "https://example.com/team",
    "https://example.com/contact",
  ])
  expect(
    normalizeExtractResponse(
      response([
        { url: "https://example.com/", full_content: "[A](/a) [B](/b)" },
      ]),
      1
    ).results[0].links
  ).toEqual(["https://example.com/a"])
})
test("extract failures preserve a safe status without provider error content", () => {
  const result = normalizeExtractResponse(
    response(
      [],
      [
        {
          url: "https://example.com/missing",
          http_status_code: 404,
          error_type: "private-query",
          content: "secret-key",
        },
      ]
    ),
    0
  )
  expect(result.provider.statuses).toEqual([
    {
      id: "https://example.com/missing",
      source: "parallel",
      status: "http_404",
    },
  ])
  expect(JSON.stringify(result)).not.toMatch(/private-query|secret-key/)
})
