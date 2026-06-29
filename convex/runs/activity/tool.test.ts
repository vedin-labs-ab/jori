import { expect, test } from "vitest"
import { type Doc, type Id, type TableNames } from "../../_generated/dataModel"
import { projectActivity } from "./project"
import { type ActivityData } from "./types"

test("projects compact tool metadata over generic result descriptions", () => {
  const items = projectActivity(
    data({
      traces: [
        trace({
          callId: "call-1",
          data: {
            access: "read",
            metadata: [{ kind: "target", text: "current example" }],
            name: "web_search",
            route: "convex",
          },
          timestamp: 10,
          type: "tool.started",
        }),
        trace({
          callId: "call-1",
          data: {
            access: "read",
            metadata: [
              { kind: "target", text: "current example" },
              { kind: "outcome", text: "3 results" },
            ],
            name: "web_search",
            result: { size: 3, type: "object" },
            route: "convex",
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
        { kind: "outcome", text: "3 results" },
      ],
      title: "Web Search",
    })
  )
})

function data(overrides: Partial<ActivityData>): ActivityData {
  return {
    agents: [],
    approvals: [],
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
    source: "trigger.tool",
    tenantId: "tenant",
    ...overrides,
  } as Doc<"traces">
}

function run(): Doc<"runs"> {
  return {
    _creationTime: 0,
    _id: id<"runs">("run"),
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
