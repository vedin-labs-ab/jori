import { expect, test } from "vitest"
import { activityData, traceDoc } from "../../../../test/convex/console"
import { projectActivity } from "../project"
import { type ToolResult } from "../read"

test.each<ToolResult>([
  { kind: "array", size: Number.NaN },
  { kind: "object", size: Number.POSITIVE_INFINITY },
  { kind: "number", preview: " " },
  { kind: "string", preview: " ", length: 1 },
  { kind: "string", preview: "text", length: Number.NEGATIVE_INFINITY },
])("omits unusable result details for $kind summaries", (result) => {
  const items = projectActivity(
    activityData({
      traces: [
        traceDoc({
          callId: "call-1",
          data: {
            provider: null,
            result,
            tool: { access: "read", name: "read", route: "sandbox" },
          },
          sequence: 1,
          timestamp: 24,
          type: "tool.completed",
        }),
      ],
    })
  )

  expect(items).toHaveLength(1)
  expect(items[0]).toMatchObject({ details: [], status: "completed" })
})

test.each([
  {
    label: "with a domain restriction",
    input: { includeDomains: ["example.com"], query: "current example" },
    metadata: [
      { kind: "target", text: "current example" },
      { kind: "scope", text: "in example.com" },
    ],
  },
  {
    label: "with empty domain restrictions",
    input: {
      includeDomains: [],
      excludeDomains: [null, 1],
      query: "current example",
    },
    metadata: [{ kind: "target", text: "current example" }],
  },
  {
    label: "without a domain restriction",
    input: { query: "current example" },
    metadata: [{ kind: "target", text: "current example" }],
  },
])("projects tool metadata $label without inventing a description from its result", ({
  input,
  metadata,
}) => {
  const items = projectActivity(
    activityData({
      traces: [
        traceDoc({
          callId: "call-1",
          data: {
            input,
            tool: { access: "read", name: "web_search", route: "convex" },
          },
          timestamp: 10,
          type: "tool.started",
        }),
        traceDoc({
          callId: "call-1",
          data: {
            provider: null,
            result: { kind: "object", size: 3 },
            tool: { access: "read", name: "web_search", route: "convex" },
          },
          timestamp: 24,
          type: "tool.completed",
        }),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      description: undefined,
      kind: "tool",
      metadata,
      title: "Web Search",
    })
  )
})
