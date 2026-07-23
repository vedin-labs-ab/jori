import { beforeEach, expect, test, vi } from "vitest"
import { runtimeId } from "../../test/trigger"
import { type AgentRuntime } from "../runtime"
import { executeToolCall } from "../tool"

const triggerWait = vi.hoisted(() => ({
  createToken: vi.fn(async () => ({ id: "waitpoint_1" })),
  forToken: vi.fn(),
}))

vi.mock("@trigger.dev/sdk", () => ({
  wait: {
    createToken: triggerWait.createToken,
    forToken: triggerWait.forToken,
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

test("wait_for_agents returns immediately when every child is terminal", async () => {
  const runtime = createRuntime()
  runtime.platform.readAgentRuns = vi.fn(async () => [
    {
      runId: runtimeId<"runs">("run_child"),
      title: "Research attendees",
      status: "completed" as const,
      error: null,
      result: "Two attendees confirmed; no open commitments.",
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
        result: "Two attendees confirmed; no open commitments.",
      },
    ],
  })
})

test("wait_for_agents defaults a missing timeout to 15 minutes", async () => {
  const now = Date.parse("2026-07-13T08:00:00.000Z")
  const runtime = createRuntime()
  runtime.platform.readAgentRuns = vi
    .fn()
    .mockResolvedValueOnce([agentRun("running")])
    .mockResolvedValue([agentRun("completed")])
  runtime.platform.createWaiter = vi.fn(async () =>
    runtimeId<"waiters">("waiter_1")
  )
  runtime.platform.expireWaiter = vi.fn()
  const clock = vi.spyOn(Date, "now").mockReturnValue(now)

  await executeToolCall({
    attempt: 1,
    call: {
      args: { runIds: ["run_child"] },
      id: "call_1",
      name: "wait_for_agents",
    },
    runtime,
    sequence: 100,
  })

  clock.mockRestore()
  expect(runtime.platform.createWaiter).toHaveBeenCalledWith(
    expect.objectContaining({ expiresAt: now + 15 * 60 * 1000 })
  )
})

test("wait_for_agents turns a relative timeout into a waitpoint expiry", async () => {
  const now = Date.parse("2026-07-13T08:00:00.000Z")
  const runtime = createRuntime()
  const running = agentRun("running")
  const completed = agentRun("completed")
  runtime.platform.readAgentRuns = vi
    .fn()
    .mockResolvedValueOnce([running])
    .mockResolvedValue([completed])
  runtime.platform.createWaiter = vi.fn(async () =>
    runtimeId<"waiters">("waiter_1")
  )
  runtime.platform.expireWaiter = vi.fn()
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
  expect(runtime.platform.createWaiter).toHaveBeenCalledWith({
    condition: { kind: "runs", runIds: ["run_child"] },
    expiresAt: now + 15 * 60 * 1000,
    runId: "run_1",
    waitpointId: "waitpoint_1",
  })
  expect(runtime.platform.expireWaiter).toHaveBeenCalledWith({
    waiterId: "waiter_1",
  })
  expect(triggerWait.forToken).not.toHaveBeenCalled()
  expect(
    vi
      .mocked(runtime.platform.recordEvent)
      .mock.calls.map(([event]) => event.type)
  ).toEqual([
    "tool.started",
    "run.waiting",
    "tool.waiting",
    "run.resumed",
    "tool.completed",
  ])
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

function createRuntime(): AgentRuntime {
  return {
    platform: {
      recordEvent: vi.fn(),
    } as unknown as AgentRuntime["platform"],
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
        id: runtimeId<"runs">("run_1"),
        rootId: null,
        sandboxId: null,
        status: "running",
        organizationId: "organization",
      },
      result: null,
      session: null,
      tools: [
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
    sandbox: {} as AgentRuntime["sandbox"],
  }
}

function agentRun(status: "completed" | "running") {
  return {
    runId: runtimeId<"runs">("run_child"),
    title: "Research attendees",
    status,
    error: null,
    result: null,
  }
}
