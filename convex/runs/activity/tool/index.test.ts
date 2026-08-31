import { expect, test } from "vitest"
import { activityData, traceDoc } from "../../../../test/convex/console"
import { projectActivity } from "../project"

test("projects compact tool metadata from raw input", () => {
  const items = projectActivity(
    activityData({
      traces: [
        traceDoc({
          callId: "call-1",
          data: {
            input: {
              includeDomains: ["example.com"],
              query: "current example",
            },
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
      metadata: [
        { kind: "target", text: "current example" },
        { kind: "scope", text: "in example.com" },
      ],
      title: "Web Search",
    })
  )
})

test("does not synthesize descriptions from result shape", () => {
  const items = projectActivity(
    activityData({
      traces: [
        traceDoc({
          callId: "call-1",
          data: {
            input: { query: "current example" },
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
      metadata: [{ kind: "target", text: "current example" }],
      title: "Web Search",
    })
  )
})
