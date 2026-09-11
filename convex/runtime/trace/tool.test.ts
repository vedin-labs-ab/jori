import { expect, test } from "vitest"
import { toolTraceDetails, traceToolInput } from "./tool"

test("captures arbitrary tool input args", () => {
  const input = {
    parent: { page_id: "page_1" },
    properties: { title: "Private title" },
  }

  expect(traceToolInput(input)).toEqual(input)
})

test("drops oversized tool input args", () => {
  expect(traceToolInput({ body: "x".repeat(33 * 1024) })).toBeNull()
})

test("summarizes tool result values", () => {
  expect(toolTraceDetails("x".repeat(600))).toEqual({
    provider: null,
    result: {
      kind: "string",
      length: 600,
      preview: "x".repeat(500),
    },
  })

  expect(toolTraceDetails([{ id: 1 }, { id: 2 }])).toEqual({
    provider: null,
    result: { kind: "array", size: 2 },
  })
})

test("captures provider request metadata on completed tool results", () => {
  expect(
    toolTraceDetails({
      provider: { name: "parallel", requestId: "request-1" },
      results: [{ title: "Private title" }],
    })
  ).toEqual({
    provider: { name: "parallel", request: "request-1" },
    result: { kind: "array", size: 1 },
  })
})

test("summarizes list-like object tool results", () => {
  expect(
    toolTraceDetails({
      cursor: "next-page",
      runs: [{ runId: "run-1" }, { runId: "run-2" }],
    }).result
  ).toEqual({
    hasMore: true,
    itemCount: 2,
    itemKey: "runs",
    kind: "object",
    size: 2,
  })

  expect(
    toolTraceDetails({
      cursor: null,
      items: [],
    }).result
  ).toEqual({
    hasMore: false,
    itemCount: 0,
    itemKey: "items",
    kind: "object",
    size: 2,
  })
})
