import { beforeEach, expect, test, vi } from "vitest"
import { executeToolCall, type ToolRuntime } from "../tool"
import { type ConvexId } from "../types"

beforeEach(() => {
  vi.clearAllMocks()
})

test("start_agent forwards its explicit title", async () => {
  const runtime = createRuntime()
  const call = {
    args: {
      task: "Research the attendees.",
      title: "Research attendees",
      tools: ["web_search"],
    },
    id: "call_1",
    name: "start_agent",
  }

  const result = await executeToolCall({
    attempt: 1,
    call,
    runtime,
    sequence: 100,
  })

  expect(JSON.parse(result.content)).toEqual({ runId: "run_child" })
  expect(runtime.convex.createAgentRun).toHaveBeenCalledWith({
    parentId: "run_1",
    task: "Research the attendees.",
    title: "Research attendees",
    tools: ["web_search"],
  })
})

test("start_agent rejects a missing title before creating a run", async () => {
  const runtime = createRuntime()

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: { task: "Research the attendees." },
      id: "call_1",
      name: "start_agent",
    },
    runtime,
    sequence: 100,
  })

  expect(JSON.parse(result.content)).toEqual({
    error: { message: "Missing title" },
    status: "error",
  })
  expect(runtime.convex.createAgentRun).not.toHaveBeenCalled()
})

test("wait_for_agents returns immediately when every child is terminal", async () => {
  const runtime = createRuntime()
  runtime.convex.readAgentRuns = vi.fn(async () => [
    {
      runId: id<"runs">("run_child"),
      title: "Research attendees",
      status: "completed" as const,
      error: null,
    },
  ])

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: {
        deadline: "2099-07-12T18:00:00.000Z",
        runIds: ["run_child"],
      },
      id: "call_1",
      name: "wait_for_agents",
    },
    runtime,
    sequence: 100,
  })

  expect(JSON.parse(result.content)).toEqual({
    reason: "completed",
    runs: [
      {
        runId: "run_child",
        title: "Research attendees",
        status: "completed",
        error: null,
      },
    ],
  })
})

function createRuntime(): ToolRuntime {
  return {
    convex: {
      createAgentRun: vi.fn(async () => ({
        runId: id<"runs">("run_child"),
      })),
      recordEvent: vi.fn(),
    } as unknown as ToolRuntime["convex"],
    context: {
      activeSurface: null,
      drained: null,
      handoffs: { approvals: [], offers: [] },
      prompt: {
        context: "context",
        instructions: "system",
        organization: null,
        place: null,
        person: null,
        requester: null,
      },
      run: {
        id: id<"runs">("run_1"),
        rootId: null,
        sandboxId: null,
        status: "running",
        tenantId: "tenant",
      },
      session: null,
      tools: [
        {
          access: "write",
          description: "Start an agent.",
          inputSchema: {},
          mode: "required",
          name: "start_agent",
          route: "agent",
        },
        {
          access: "read",
          description: "Wait for agents.",
          inputSchema: {},
          mode: "required",
          name: "wait_for_agents",
          route: "agent",
        },
      ],
    },
    sandbox: {} as ToolRuntime["sandbox"],
  }
}

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}
