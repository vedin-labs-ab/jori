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

test("labels artifact shares with the title and link lifetime", () => {
  const artifactId = id<"artifacts">("artifact")
  const items = projectActivity(
    data({
      artifacts: [artifact({ _id: artifactId, title: "Meeting prep" })],
      traces: [
        trace({
          callId: "call-1",
          data: {
            input: { artifactId, expiresInHours: 24 },
            tool: {
              access: "write",
              name: "share_artifact",
              route: "convex",
            },
          },
          timestamp: 10,
          type: "tool.started",
        }),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      metadata: [
        { kind: "target", text: "Meeting prep" },
        { kind: "scope", text: "24h link" },
      ],
      tool: "share_artifact",
    })
  )
})

test("labels inferred artifact state reads with the title and state entry", () => {
  const artifactId = id<"artifacts">("artifact")
  const items = projectActivity(
    data({
      artifacts: [artifact({ _id: artifactId, title: "Meeting prep" })],
      run: run({ artifactId }),
      traces: [
        trace({
          callId: "call-1",
          data: {
            input: { contractName: "meetings" },
            tool: {
              access: "read",
              name: "read_artifact_state",
              route: "convex",
            },
          },
          timestamp: 10,
          type: "tool.started",
        }),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      metadata: [
        { kind: "target", text: "Meeting prep" },
        { kind: "scope", text: "meetings" },
      ],
      tool: "read_artifact_state",
    })
  )
})

test("labels inferred artifact state updates with the title and state entry", () => {
  const artifactId = id<"artifacts">("artifact")
  const items = projectActivity(
    data({
      artifacts: [artifact({ _id: artifactId, title: "Meeting prep" })],
      run: run({ artifactId }),
      traces: [
        trace({
          callId: "call-1",
          data: {
            input: { contractName: "dossiers", patch: { status: "ready" } },
            tool: {
              access: "write",
              name: "update_artifact_state",
              route: "convex",
            },
          },
          timestamp: 10,
          type: "tool.started",
        }),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      metadata: [
        { kind: "target", text: "Meeting prep" },
        { kind: "scope", text: "dossiers" },
      ],
      tool: "update_artifact_state",
    })
  )
})

function data(overrides: Partial<ActivityData>): ActivityData {
  return {
    agents: [],
    approvals: [],
    artifacts: [],
    assets: [],
    offers: [],
    run: run({}),
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

function run(overrides: Partial<Doc<"runs">>): Doc<"runs"> {
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
    ...overrides,
  } as Doc<"runs">
}

function artifact(overrides: Partial<Doc<"artifacts">>): Doc<"artifacts"> {
  return {
    _creationTime: 0,
    _id: id<"artifacts">("artifact"),
    access: "organization",
    createdAt: 0,
    ownerId: id<"persons">("person"),
    tenantId: "tenant",
    title: "Artifact",
    updatedAt: 0,
    ...overrides,
  }
}

function id<TableName extends TableNames>(value: string) {
  return value as Id<TableName>
}
