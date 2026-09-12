import { expect, test } from "vitest"
import {
  activityData,
  runDoc,
  runSnapshot,
  traceDoc,
} from "../../../test/convex/console"
import { id } from "../../../test/convex/database"
import { type Doc } from "../../_generated/dataModel"
import { agentWaitMetadata } from "./metadata/agents"
import { projectActivity } from "./project"

test("projects parked agent waits without active execution", () => {
  const items = projectActivity(
    activityData({
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
    activityData({
      agents: [agent("completed", "completed")],
      traces: [
        ...agentWaitTraces(),
        traceDoc({
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

test.each([{ value: undefined }, { value: [] }, { value: [null, 1] }])(
  "omits agent metadata for an empty wait selection: %j",
  ({ value: runIds }) => {
    expect(
      agentWaitMetadata("wait_for_agents", { runIds }, [
        agent("running", "running"),
      ])
    ).toEqual([])
  }
)

function agentWaitTraces() {
  return [
    traceDoc({
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
    traceDoc({
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

function agent(status: Doc<"runs">["status"], runId: string) {
  return runDoc({
    _id: id<"runs">(runId),
    parentId: id<"runs">("run"),
    snapshot: runSnapshot(`Agent ${runId}`),
    status,
  })
}
