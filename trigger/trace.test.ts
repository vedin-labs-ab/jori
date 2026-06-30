import { expect, test } from "vitest"
import { toolTraceDetails, traceToolInput } from "./trace"

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
      provider: { name: "exa", requestId: "request-1" },
      results: [{ title: "Private title" }],
    })
  ).toEqual({
    provider: { name: "exa", request: "request-1" },
    result: { kind: "object", size: 2 },
  })
})
