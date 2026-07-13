import { beforeEach, expect, test, vi } from "vitest"
import { executeToolCall, type ToolRuntime } from "../tool"
import { type ConvexId } from "../types"

const triggerWait = vi.hoisted(() => ({
  createToken: vi.fn(async () => ({ id: "waitpoint_1" })),
  forToken: vi.fn(),
}))

vi.mock("@trigger.dev/sdk/v3", () => ({
  wait: {
    createToken: triggerWait.createToken,
    forToken: triggerWait.forToken,
  },
}))

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
        runIds: ["run_child"],
        timeout: { unit: "minutes", value: 15 },
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

test("wait_for_agents turns a relative timeout into a waitpoint expiry", async () => {
  const now = Date.parse("2026-07-13T08:00:00.000Z")
  const runtime = createRuntime()
  const running = agentRun("running")
  const completed = agentRun("completed")
  runtime.convex.readAgentRuns = vi
    .fn()
    .mockResolvedValueOnce([running])
    .mockResolvedValue([completed])
  runtime.convex.createWaiter = vi.fn(async () => id<"waiters">("waiter_1"))
  runtime.convex.expireWaiter = vi.fn()
  const clock = vi.spyOn(Date, "now").mockReturnValue(now)

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: {
        runIds: ["run_child"],
        timeout: { unit: "minutes", value: 15 },
      },
      id: "call_1",
      name: "wait_for_agents",
    },
    runtime,
    sequence: 100,
  })

  clock.mockRestore()
  expect(JSON.parse(result.content)).toEqual({
    reason: "completed",
    runs: [completed],
  })
  expect(runtime.convex.createWaiter).toHaveBeenCalledWith({
    condition: { kind: "runs", runIds: ["run_child"] },
    expiresAt: now + 15 * 60 * 1000,
    runId: "run_1",
    waitpointId: "waitpoint_1",
  })
  expect(runtime.convex.expireWaiter).toHaveBeenCalledWith({
    waiterId: "waiter_1",
  })
  expect(triggerWait.forToken).not.toHaveBeenCalled()
})

test("wait_for_agents rejects timeouts outside its bounds", async () => {
  const runtime = createRuntime()

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: {
        runIds: ["run_child"],
        timeout: { unit: "seconds", value: 4 },
      },
      id: "call_1",
      name: "wait_for_agents",
    },
    runtime,
    sequence: 100,
  })

  expect(JSON.parse(result.content)).toEqual({
    error: { message: "timeout must be between 5 seconds and 30 days." },
    status: "error",
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

function agentRun(status: "completed" | "running") {
  return {
    runId: id<"runs">("run_child"),
    title: "Research attendees",
    status,
    error: null,
  }
}
