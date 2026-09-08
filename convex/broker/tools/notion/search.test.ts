import { afterEach, expect, test, vi } from "vitest"
import { schemaViolations } from "../../../../test/convex/schema"
import { integration } from "../../../../test/convex/tools"
import { getToolResponseSchema } from "../../../runs/agent/tools/schemas/responses"
import { callNotionTool } from "."

afterEach(() => vi.unstubAllGlobals())

test("Notion search passes current page and data source variants through unchanged", async () => {
  const payload = {
    object: "list",
    results: [
      {
        object: "page",
        id: "synthetic-page",
        properties: { title: { type: "title", title: [] } },
        parent: { type: "workspace", workspace: true },
        url: "https://www.notion.so/synthetic-page",
      },
      {
        object: "data_source",
        id: "synthetic-source",
        properties: {
          Name: { id: "title", name: "Name", type: "title", title: {} },
        },
        parent: { type: "database_id", database_id: "synthetic-database" },
        title: [],
        url: "https://www.notion.so/synthetic-database",
      },
    ],
    has_more: false,
    next_cursor: null,
  }
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json(payload)
  )
  vi.stubGlobal("fetch", fetch)

  const result = await callNotionTool(integration("notion"), "notion_search", {
    query: "Synthetic",
  })

  expect(result).toEqual(payload)
  expect(fetch.mock.calls[0]).toMatchObject([
    "https://api.notion.com/v1/search",
    { headers: { "notion-version": "2026-03-11" } },
  ])
  expect(
    schemaViolations(result, getToolResponseSchema("notion_search"))
  ).toEqual([])
})

test.each([
  { object: "database", id: "legacy-database" },
  { object: "block", id: "synthetic-block" },
  { object: "page" },
  { object: "data_source", id: 1 },
  {},
  null,
  [],
])("Notion search rejects unsupported or malformed result %j", (result) => {
  expect(
    schemaViolations(
      { object: "list", results: [result], has_more: false, next_cursor: null },
      getToolResponseSchema("notion_search")
    )
  ).not.toEqual([])
})
