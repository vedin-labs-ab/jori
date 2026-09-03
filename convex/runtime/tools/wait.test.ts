import { beforeEach, expect, test, vi } from "vitest"
import { createPlatform } from "../../../test/platform"
import {
  createRuntime,
  runTool,
  runtimeContext,
  runtimeId,
} from "../../../test/runtime"
import { isParked } from "../loop/park"
import { type AgentRuntime } from "../platform"
import { executeToolCall } from "./index"

beforeEach(() => {
  vi.clearAllMocks()
})

test("wait_for_agents returns immediately when every child is terminal", async () => {
  const runtime = waitRuntime()
  runtime.platform.readAgentRuns = vi.fn(async () => [agentRun("completed")])

  const result = await runTool({
    call: {
      args: {
        runIds: ["run_child"],
        timeout: { unit: "minutes", value: 15 },
      },
      id: "call_1",
      name: "wait_for_agents",
    },
    runtime,
  })

  expect(JSON.parse(result.content)).toEqual({
    reason: "completed",
    runs: [agentRun("completed")],
  })
  expect(runtime.platform.park).not.toHaveBeenCalled()
})

test("wait_for_agents defaults a missing timeout to 15 minutes", async () => {
  const now = Date.parse("2026-07-13T08:00:00.000Z")
  const runtime = waitRuntime()
  runtime.platform.readAgentRuns = vi.fn(async () => [agentRun("running")])
  const clock = vi.spyOn(Date, "now").mockReturnValue(now)

  await executeToolCall({
    call: {
      args: { runIds: ["run_child"] },
      id: "call_1",
      name: "wait_for_agents",
    },
    runtime,
    sequence: 100,
  })

  clock.mockRestore()
  expect(runtime.platform.park).toHaveBeenCalledWith(
    expect.objectContaining({ expiresAt: now + 15 * 60 * 1000 })
  )
})

test("wait_for_agents parks on its children and reports the wake", async () => {
  const now = Date.parse("2026-07-13T08:00:00.000Z")
  const runtime = waitRuntime()
  let children = [agentRun("running")]
  runtime.platform.readAgentRuns = vi.fn(async () => children)
  const clock = vi.spyOn(Date, "now").mockReturnValue(now)

  const parked = await executeToolCall({
    call: waitCall(),
    runtime,
    sequence: 100,
  })

  clock.mockRestore()
  expect(isParked(parked)).toBe(true)
  expect(runtime.platform.park).toHaveBeenCalledWith({
    condition: { kind: "runs", runIds: ["run_child"] },
    expiresAt: now + 15 * 60 * 1000,
  })

  children = [agentRun("completed")]

  const result = await runTool({
    call: waitCall(),
    runtime,
    wake: { reason: "resolved", waiter: runtimeId<"waiters">("waiter_1") },
  })

  expect(JSON.parse(result.content)).toEqual({
    reason: "completed",
    runs: [agentRun("completed")],
  })
  expect(
    vi
      .mocked(runtime.platform.recordEvent)
      .mock.calls.map(([event]) => event.type)
  ).toEqual([
    "tool.started",
    "run.waiting",
    "tool.waiting",
    "tool.started",
    "run.resumed",
    "tool.completed",
  ])
})

test("wait_for_agents resolves in place when the children finish first", async () => {
  const runtime = waitRuntime()
  runtime.platform.readAgentRuns = vi
    .fn()
    .mockResolvedValueOnce([agentRun("running")])
    .mockResolvedValue([agentRun("completed")])

  const result = await runTool({ call: waitCall(), runtime })

  expect(JSON.parse(result.content)).toEqual({
    reason: "completed",
    runs: [agentRun("completed")],
  })
  expect(runtime.platform.resolveWaiter).toHaveBeenCalledWith({
    waiterId: "waiter_1",
  })
})

test("wait_for_agents rejects timeouts outside its bounds", async () => {
  const runtime = waitRuntime()

  const result = await runTool({
    call: {
      args: {
        runIds: ["run_child"],
        timeout: { unit: "seconds", value: 4 },
      },
      id: "call_1",
      name: "wait_for_agents",
    },
    runtime,
  })

  expect(JSON.parse(result.content)).toEqual({
    error: { message: "timeout must be between 5 seconds and 30 days." },
    status: "error",
  })
})

function waitCall() {
  return {
    args: {
      runIds: ["run_child"],
      timeout: { unit: "minutes", value: 15 },
    },
    id: "call_1",
    name: "wait_for_agents",
  }
}

function waitRuntime(): AgentRuntime {
  return createRuntime({
    context: runtimeContext({
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
    }),
    platform: createPlatform(),
  })
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
