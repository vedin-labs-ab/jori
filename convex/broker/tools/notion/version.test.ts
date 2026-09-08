import { afterEach, expect, test, vi } from "vitest"
import { integration } from "../../../../test/convex/tools"
import { normalizeBrokerToolInput } from "../../input"
import { callNotionTool } from "."

afterEach(() => vi.unstubAllGlobals())

test.each([
  { type: "start" },
  { type: "end" },
  { type: "after_block", after_block: { id: "block_1" } },
])("sends current block position $type unchanged", async (position) => {
  const fetch = mockFetch()
  const args = normalizeBrokerToolInput("notion_append_block_children", {
    blockId: "page_1",
    children: [],
    position,
  })

  await callNotionTool(
    integration("notion"),
    "notion_append_block_children",
    args
  )

  expect(fetch.mock.calls[0]?.[0]).toBe(
    "https://api.notion.com/v1/blocks/page_1/children"
  )
  expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
    children: [],
    position,
  })
})

test.each([
  [
    "notion_append_block_children",
    { blockId: "page_1", children: [], after: "block_1" },
  ],
  ["notion_update_page", { pageId: "page_1", archived: false }],
  [
    "notion_query_data_source",
    { sourceId: "source_1", sourceType: "database" },
  ],
  [
    "notion_append_block_children",
    { blockId: "page_1", children: [], position: { type: "after_block" } },
  ],
])("rejects removed or incomplete fields for %s", (tool, args) => {
  expect(() => normalizeBrokerToolInput(tool, args)).toThrow()
})

test("queries data sources and sends the current trash field", async () => {
  const fetch = mockFetch()
  await callNotionTool(integration("notion"), "notion_query_data_source", {
    sourceId: "source_1",
    page_size: 1,
  })
  await callNotionTool(integration("notion"), "notion_update_page", {
    pageId: "page_1",
    in_trash: false,
  })

  expect(fetch.mock.calls[0]?.[0]).toBe(
    "https://api.notion.com/v1/data_sources/source_1/query"
  )
  expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toEqual({
    in_trash: false,
  })
})

test("page parents use data sources rather than legacy database IDs", () => {
  expect(
    normalizeBrokerToolInput("notion_create_page", {
      parent: { data_source_id: "source_1" },
      properties: {},
    })
  ).toMatchObject({ parent: { data_source_id: "source_1" } })
  expect(() =>
    normalizeBrokerToolInput("notion_create_page", {
      parent: { database_id: "database_1" },
      properties: {},
    })
  ).toThrow()
})

function mockFetch() {
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json({ object: "list", results: [] })
  )
  vi.stubGlobal("fetch", fetch)
  return fetch
}
