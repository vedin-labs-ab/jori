import { expect, test } from "vitest"
import { createRuntime, runTool, runtimeContext } from "../../../test/runtime"
import { type AgentRuntime, type RuntimeTool } from "../platform/types"

test("finish_run requires a reason when an active surface has no communication", async () => {
  const runtime = finishRuntime()

  const result = await runTool({
    call: {
      args: {},
      id: "call_1",
      name: "finish_run",
    },
    runtime,
  })

  expect(result.finished).toBe(false)
  expect(JSON.parse(result.content)).toEqual({
    error: {
      message:
        "finish_run requires reason when no visible communication was sent.",
    },
    status: "error",
  })
})

test("finish_run never ends a chat message silently, reason or not", async () => {
  const runtime = finishRuntime({
    activeSurface: { communicated: false, surface: "console", target: null },
  })

  const result = await runTool({
    call: {
      args: { reason: "The requester said that was all." },
      id: "call_1",
      name: "finish_run",
    },
    runtime,
  })

  expect(result.finished).toBe(false)
  expect(JSON.parse(result.content)).toEqual({
    error: {
      message:
        "Every message in the chat gets a reply: call send_reply before finish_run.",
    },
    status: "error",
  })
})

test("finish_run completes after visible communication", async () => {
  const runtime = finishRuntime({ communicated: true })

  const result = await runTool({
    call: {
      args: {},
      id: "call_1",
      name: "finish_run",
    },
    runtime,
  })

  expect(result.finished).toBe(true)
  expect(JSON.parse(result.content)).toEqual({
    communicated: true,
    reason: null,
    status: "finished",
  })
})

test("finish_run completes job runs without a reason", async () => {
  const runtime = finishRuntime({ activeSurface: null })

  const result = await runTool({
    call: {
      args: {},
      id: "call_1",
      name: "finish_run",
    },
    runtime,
  })

  expect(result.finished).toBe(true)
  expect(JSON.parse(result.content)).toEqual({
    communicated: false,
    reason: null,
    status: "finished",
  })
})

test("finish_run stores its result on the run for the parent", async () => {
  const runtime = finishRuntime({ activeSurface: null })

  const result = await runTool({
    call: {
      args: { result: "Summary of the delegated work." },
      id: "call_1",
      name: "finish_run",
    },
    runtime,
  })

  expect(result.finished).toBe(true)
  expect(runtime.platform.finishRun).toHaveBeenCalledWith({
    result: "Summary of the delegated work.",
  })
})

test("finish_run rejects an oversized result", async () => {
  const runtime = finishRuntime({ activeSurface: null })

  const result = await runTool({
    call: {
      args: { result: "x".repeat(8001) },
      id: "call_1",
      name: "finish_run",
    },
    runtime,
  })

  expect(result.finished).toBe(false)
  expect(runtime.platform.finishRun).not.toHaveBeenCalled()
  expect(result.content).toContain("at most 8000 characters")
})

function finishRuntime(
  options: {
    activeSurface?: AgentRuntime["context"]["activeSurface"]
    communicated?: boolean
  } = {}
): AgentRuntime {
  return createRuntime({
    context: runtimeContext({
      activeSurface: activeSurfaceState(options),
      tools: [finishRunTool()],
    }),
  })
}

function activeSurfaceState(options: {
  activeSurface?: AgentRuntime["context"]["activeSurface"]
  communicated?: boolean
}): AgentRuntime["context"]["activeSurface"] {
  return "activeSurface" in options
    ? (options.activeSurface ?? null)
    : {
        communicated: options.communicated ?? false,
        surface: "slack",
        target: null,
      }
}

function finishRunTool(): RuntimeTool {
  return {
    access: "write",
    description: "Finish run.",
    inputSchema: {},
    name: "finish_run",
    route: "run",
  }
}
