import { expect, test } from "vitest"
import { type Doc, type Id, type TableNames } from "../../_generated/dataModel"
import { projectActivity } from "./project"
import { type ActivityData } from "./types"

test("projects parked agent waits without active execution", () => {
  const items = projectActivity(
    data({
      agents: [
        agent("queued", "queued"),
        agent("running", "running"),
        agent("completed", "completed"),
        agent("failed", "failed"),
        agent("stopped", "stopped"),
      ],
      traces: agentWaitTraces(),
    })
  )
  const item = items.find((candidate) => candidate.tool === "wait_for_agents")

  expect(item).toMatchObject({
    durationMs: 10,
    endedAt: 20,
    isLive: false,
    metadata: [
      { kind: "outcome", text: "2 ongoing" },
      { kind: "outcome", text: "1 succeeded" },
      { kind: "outcome", text: "1 failed" },
      { kind: "outcome", text: "1 stopped" },
    ],
    status: "waiting",
  })
})

test("excludes parked time from completed tool duration", () => {
  const items = projectActivity(
    data({
      agents: [agent("completed", "completed")],
      traces: [
        ...agentWaitTraces(),
        trace({
          callId: "wait-call",
          data: {
            provider: null,
            result: { kind: "object", size: 2 },
            tool: waitTool(),
          },
          timestamp: 1000,
          type: "tool.completed",
        }),
      ],
    })
  )
  const item = items.find((candidate) => candidate.tool === "wait_for_agents")

  expect(item).toMatchObject({
    durationMs: 10,
    endedAt: 20,
    isLive: false,
    status: "completed",
  })
})

function agentWaitTraces() {
  return [
    trace({
      callId: "wait-call",
      data: {
        input: {
          runIds: ["queued", "running", "completed", "failed", "stopped"],
          timeout: { unit: "minutes", value: 15 },
        },
        tool: waitTool(),
      },
      timestamp: 10,
      type: "tool.started",
    }),
    trace({
      callId: "wait-call",
      data: { tool: waitTool() },
      timestamp: 20,
      type: "tool.waiting",
    }),
  ]
}

function waitTool() {
  return {
    access: "read" as const,
    name: "wait_for_agents",
    route: "agent" as const,
  }
}

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
    organizationId: "organization",
    ...overrides,
  } as Doc<"traces">
}

function agent(status: Doc<"runs">["status"], runId: string) {
  return run({
    _id: id<"runs">(runId),
    parentId: id<"runs">("run"),
    snapshot: snapshot(`Agent ${runId}`),
    status,
  })
}

function run(overrides: Partial<Doc<"runs">>): Doc<"runs"> {
  return {
    _creationTime: 0,
    _id: id<"runs">("run"),
    cause: { type: "manual" },
    createdAt: 0,
    snapshot: snapshot("Run"),
    status: "running",
    organizationId: "organization",
    ...overrides,
  } as Doc<"runs">
}

function snapshot(title: string): Doc<"runs">["snapshot"] {
  return { context: [], source: { type: "manual" }, title }
}

function id<TableName extends TableNames>(value: string) {
  return value as Id<TableName>
}
