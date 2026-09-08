import { expect, test } from "vitest"
import { activityData, traceDoc } from "../../../../test/convex/console"
import { projectActivity } from "../project"

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
