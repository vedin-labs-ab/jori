import { expect, test } from "vitest"
import { type Doc, type Id, type TableNames } from "../../_generated/dataModel"
import { projectActivity } from "./project"
import { type ActivityData } from "./types"

test("projects compact tool metadata from raw input", () => {
  const items = projectActivity(
    data({
      traces: [
        trace({
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
        trace({
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
    data({
      traces: [
        trace({
          callId: "call-1",
          data: {
            input: { query: "current example" },
            tool: { access: "read", name: "web_search", route: "convex" },
          },
          timestamp: 10,
          type: "tool.started",
        }),
        trace({
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

function data(overrides: Partial<ActivityData>): ActivityData {
  return {
    agents: [],
    approvals: [],
    assets: [],
    offers: [],
    run: run(),
    traces: [],
    waiters: [],
    ...overrides,
  }
}

function trace(
  overrides: Partial<Doc<"traces">> & Pick<Doc<"traces">, "timestamp" | "type">
): Doc<"traces"> {
  return {
    _creationTime: overrides.timestamp,
    _id: id<"traces">(`trace-${overrides.timestamp}`),
    callId: undefined,
    key: `trace:${overrides.timestamp}`,
    runId: id<"runs">("run"),
    sequence: undefined,
    tenantId: "tenant",
    ...overrides,
  } as Doc<"traces">
}

function run(): Doc<"runs"> {
  return {
    _creationTime: 0,
    _id: id<"runs">("run"),
    principal: { kind: "organization" },
    scope: "person",
    cause: { type: "manual" },
    createdAt: 0,
    snapshot: {
      context: [],
      source: { type: "manual" },
      title: "Run",
    },
    status: "running",
    tenantId: "tenant",
  } as Doc<"runs">
}

function id<TableName extends TableNames>(value: string) {
  return value as Id<TableName>
}
