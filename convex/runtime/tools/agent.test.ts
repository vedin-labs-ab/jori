import { beforeEach, expect, test, vi } from "vitest"
import { createRuntime, runTool, runtimeContext } from "../../../test/runtime"
import { type AgentRuntime } from "../platform"

beforeEach(() => {
  vi.clearAllMocks()
})

test("start_agent forwards its explicit title", async () => {
  const runtime = agentRuntime()
  const call = {
    args: {
      task: "Research the attendees.",
      title: "Research attendees",
      tools: ["web_search"],
    },
    id: "call_1",
    name: "start_agent",
  }

  const result = await runTool({
    call,
    runtime,
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
  const runtime = agentRuntime()

  const result = await runTool({
    call: {
      args: { task: "Research the attendees." },
      id: "call_1",
      name: "start_agent",
    },
    runtime,
  })

  expect(JSON.parse(result.content)).toEqual({
    error: { message: "title is required" },
    status: "error",
  })
  expect(runtime.platform.createAgentRun).not.toHaveBeenCalled()
})

test("stop_agent stops a direct child through the platform", async () => {
  const runtime = agentRuntime()

  const result = await runTool({
    call: {
      args: { runId: "run_child" },
      id: "call_1",
      name: "stop_agent",
    },
    runtime,
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

function agentRuntime(): AgentRuntime {
  return createRuntime({
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
  })
}
