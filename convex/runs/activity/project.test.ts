import { expect, test } from "vitest"
import { type Doc, type Id, type TableNames } from "../../_generated/dataModel"
import { projectActivity } from "./project"
import { type ActivityData } from "./types"

test("groups tool traces into a safe activity item", () => {
  const items = projectActivity(data({ traces: toolTraces() }))
  const item = items.find((candidate) => candidate.kind === "tool")

  expect(item).toMatchObject({
    access: "read",
    description: "src/app.tsx",
    durationMs: 14,
    status: "completed",
    title: "Read file",
  })
  expect(item?.details).toEqual(
    expect.arrayContaining([
      { label: "Path", value: "src/app.tsx" },
      { label: "Result", value: "string" },
      { label: "Result size", value: "1200" },
    ])
  )
  expect(JSON.stringify(item)).not.toContain("secret file body")
})

test("keeps in-progress model work visible", () => {
  const items = projectActivity(
    data({
      traces: [
        trace({
          data: {
            metrics: { toolCalls: 4 },
            status: "running",
            title: "Thinking",
          },
          sequence: 99,
          timestamp: 10,
          type: "model.started",
        }),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      kind: "model",
      isLive: true,
      status: "running",
      title: "Thinking",
    })
  )
})

test("projects delegated runs as agents", () => {
  const items = projectActivity(
    data({
      agents: [
        run({
          _id: id<"runs">("agent-run"),
          parentId: id<"runs">("run"),
          snapshot: snapshot("Draft a plan"),
          status: "queued",
        }),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      id: "agent-run",
      kind: "agent",
      status: "pending",
      title: "Agent queued",
    })
  )
})

test("marks running delegated agents as live", () => {
  const items = projectActivity(
    data({
      agents: [
        run({
          _id: id<"runs">("agent-run"),
          parentId: id<"runs">("run"),
          snapshot: snapshot("Draft a plan"),
          status: "running",
        }),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      id: "agent-run",
      isLive: true,
      kind: "agent",
      status: "running",
    })
  )
})

function data(overrides: Partial<ActivityData>): ActivityData {
  return {
    agents: [],
    approvals: [],
    offers: [],
    run: run({}),
    traces: [],
    waiters: [],
    ...overrides,
  }
}

function toolTraces() {
  return [
    trace({
      data: {
        tools: {
          groups: [
            {
              label: "Workspace",
              surface: "milo",
              tools: [
                {
                  access: "read",
                  description: "Read a file.",
                  label: "Read file",
                  tool: "read",
                },
              ],
            },
          ],
          webSearch: false,
        },
      },
      timestamp: 1,
      type: "run.prepared",
    }),
    trace({
      callId: "call-1",
      data: {
        access: "read",
        input: { path: "src/app.tsx" },
        name: "read",
        route: "sandbox",
      },
      timestamp: 10,
      type: "tool.started",
    }),
    trace({
      callId: "call-1",
      data: {
        access: "read",
        name: "read",
        result: { preview: "secret file body", size: 1200, type: "string" },
        route: "sandbox",
      },
      timestamp: 24,
      type: "tool.completed",
    }),
  ]
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
    source: "trigger.run",
    tenantId: "tenant",
    ...overrides,
  } as Doc<"traces">
}

function run(overrides: Partial<Doc<"runs">>): Doc<"runs"> {
  return {
    _creationTime: 0,
    _id: id<"runs">("run"),
    cause: { type: "manual" },
    createdAt: 0,
    snapshot: snapshot("Run"),
    status: "running",
    tenantId: "tenant",
    ...overrides,
  } as Doc<"runs">
}

function id<TableName extends TableNames>(value: string) {
  return value as Id<TableName>
}

function snapshot(title: string): Doc<"runs">["snapshot"] {
  return {
    context: [],
    source: { type: "manual" },
    title,
  }
}
