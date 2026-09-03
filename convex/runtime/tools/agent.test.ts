import { beforeEach, expect, test, vi } from "vitest"
import { runtimeContext, runtimeId } from "../../test/trigger"
import { type AgentRuntime } from "../runtime"
import { executeToolCall } from "../tool"

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
  expect(runtime.platform.createAgentRun).toHaveBeenCalledWith({
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
  expect(runtime.platform.createAgentRun).not.toHaveBeenCalled()
})

test("stop_agent stops a direct child through the platform", async () => {
  const runtime = createRuntime()

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: { runId: "run_child" },
      id: "call_1",
      name: "stop_agent",
    },
    runtime,
    sequence: 100,
  })

  expect(JSON.parse(result.content)).toEqual({
    runId: "run_child",
    status: "stopped",
  })
  expect(runtime.platform.stopAgentRun).toHaveBeenCalledWith({
    parentId: "run_1",
    runId: "run_child",
  })
})

function createRuntime(): AgentRuntime {
  return {
    platform: {
      createAgentRun: vi.fn(async () => ({
        runId: runtimeId<"runs">("run_child"),
      })),
      stopAgentRun: vi.fn(async () => ({
        runId: runtimeId<"runs">("run_child"),
        status: "stopped",
      })),
      recordEvent: vi.fn(),
    } as unknown as AgentRuntime["platform"],
    context: runtimeContext({
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
          access: "write",
          description: "Stop an agent.",
          inputSchema: {},
          mode: "required",
          name: "stop_agent",
          route: "agent",
        },
      ],
    }),
    sandbox: {} as AgentRuntime["sandbox"],
  }
}
